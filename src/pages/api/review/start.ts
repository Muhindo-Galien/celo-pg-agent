import type { NextApiRequest, NextApiResponse } from "next";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { supabase } from "../../../lib/supabase";
import formidable, { Fields, Files } from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable();
    const [fields, files]: [Fields, Files] = await new Promise(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      }
    );

    const file = files.file?.[0];
    const title = fields.title?.[0];

    if (!file || !title) {
      return res.status(400).json({ error: "File and title are required" });
    }

    // Create a new review record in Supabase
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert([
        {
          title,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (reviewError) {
      throw new Error(`Failed to create review record: ${reviewError.message}`);
    }

    // Get the Python interpreter path from the virtual environment
    const agentDir = path.join(process.cwd(), "agent");
    console.log("agentDir:", agentDir);
    const pythonPath =
      process.platform === "win32"
        ? path.join(agentDir, "venv", "Scripts", "python.exe")
        : path.join(agentDir, "venv", "bin", "python");

    // Run the agent's analysis script with the uploaded file
    const pythonProcess = spawn(
      pythonPath,
      ["run.py", "--excel", file.filepath],
      {
        cwd: agentDir,
        env: {
          ...process.env,
          PYTHONPATH: agentDir,
        },
      }
    );

    let errorOutput = "";
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // Wait for the process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          resolve(null);
        } else {
          console.error("Python process error:", errorOutput);
          reject(
            new Error(
              `Agent process exited with code ${code}\nError: ${errorOutput}`
            )
          );
        }
      });
    });

    // Read the generated report file
    const reportDir = path.join(agentDir, "reports");
    const reportFiles = await readdir(reportDir);
    const latestReport = reportFiles
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a))[0];

    if (!latestReport) {
      throw new Error("No report file was generated");
    }

    const reportPath = path.join(reportDir, latestReport);
    const reportContent = await readFile(reportPath, "utf-8");
    const projects = JSON.parse(reportContent);

    // Insert projects one by one
    const projectPromises = projects.map(
      async (project: Record<string, unknown>) => {
        const { error: projectError } = await supabase.from("projects").insert([
          {
            review_id: review.id,
            project_name: project.project_name,
            project_description: project.project_description,
            project_github_url: project.project_github_url,
            project_owner_github_url: project.project_owner_github_url,
            project_url: project.project_url,
            analysis: project.analysis,
            status: "completed",
          },
        ]);

        if (projectError) {
          throw new Error(`Failed to insert project: ${projectError.message}`);
        }
      }
    );

    // Wait for all projects to be inserted
    await Promise.all(projectPromises);

    // Update the review status to completed
    const { error: updateError } = await supabase
      .from("reviews")
      .update({
        status: "completed",
      })
      .eq("id", review.id);

    if (updateError) {
      throw new Error(`Failed to update review status: ${updateError.message}`);
    }

    return res.status(200).json({
      reviewId: review.id,
      projects,
    });
  } catch (error) {
    console.error("Error processing review:", error);

    // If we have a review ID, update its status to failed
    if (error instanceof Error && "reviewId" in error) {
      await supabase
        .from("reviews")
        .update({
          status: "failed",
          error: error.message,
        })
        .eq("id", (error as Record<string, unknown>).reviewId);
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to process review",
    });
  }
}
