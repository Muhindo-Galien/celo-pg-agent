import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { projectId, humanScore, scoredBy } = await request.json();

    if (
      !projectId ||
      humanScore === undefined ||
      humanScore < 0 ||
      humanScore > 100
    ) {
      return NextResponse.json(
        { error: "Invalid project ID or score" },
        { status: 400 }
      );
    }

    // Update the project with human score
    const { data: project, error: updateError } = await supabase
      .from("projects")
      .update({
        human_score: humanScore,
        scored_by: scoredBy,
        scored_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update project score: ${updateError.message}`);
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error updating project score:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update project score",
      },
      { status: 500 }
    );
  }
}
