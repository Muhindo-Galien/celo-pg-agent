import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Project {
  id: string;
  review_id: string;
  project_name: string;
  project_description: string;
  project_github_url: string;
  project_owner_github_url: string;
  project_url: string;
  analysis: {
    code_quality: {
      overall_score: number;
      [key: string]: unknown;
    };
    celo_integration: {
      integrated: boolean;
      evidence: string[];
      [key: string]: unknown;
    };
  };
  human_score: number | null;
  final_score: number | null;
  scored_at: string | null;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  title: string;
  created_at: string;
  status: "pending" | "completed";
  error?: string;
  updated_at: string;
}

// Function to fetch projects for a specific review
export async function getProjectsByReview(reviewId: string) {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching projects: ${error.message}`);
  }

  return projects as Project[];
}

// Function to fetch a specific review with its projects
export async function getReviewWithProjects(reviewId: string) {
  try {
    // First get the review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results

    if (reviewError) {
      throw new Error(`Error fetching review: ${reviewError.message}`);
    }

    if (!review) {
      throw new Error(`Review with ID ${reviewId} not found`);
    }

    // Then get the projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (projectsError) {
      throw new Error(`Error fetching projects: ${projectsError.message}`);
    }

    return {
      ...review,
      projects: projects || [],
    };
  } catch (error) {
    console.error("Error in getReviewWithProjects:", error);
    throw error;
  }
}

// Function to fetch all reviews
export async function getAllReviews() {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching reviews: ${error.message}`);
  }

  return reviews as Review[];
}

// Function to update a project's score
export async function updateProjectScore(
  projectId: string,
  humanScore: number,
  scoredBy: string
) {
  // First, get the project to access its overall_score
  const { data: existingProject, error: fetchError } = await supabase
    .from("projects")
    .select("analysis")
    .eq("id", projectId)
    .single();

  if (fetchError) {
    throw new Error(`Error fetching project: ${fetchError.message}`);
  }

  if (!existingProject) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  // Get the overall_score from the analysis
  const overallScore = existingProject.analysis.code_quality.overall_score;

  // Calculate final score as average of overall_score and human_score
  const finalScore = Math.round((overallScore + humanScore) / 2);

  // Update the project with human score and calculated final score
  const { data: project, error: updateError } = await supabase
    .from("projects")
    .update({
      human_score: humanScore,
      final_score: finalScore,
      scored_by: scoredBy,
      scored_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Error updating project score: ${updateError.message}`);
  }

  return project as Project;
}

// Function to get all completed reviews with their projects
export async function getCompletedReviews() {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select(
      `
      *,
      projects (
        id,
        project_name,
        project_description,
        project_github_url,
        project_owner_github_url,
        project_url,
        analysis,
        human_score,
        final_score,
        scored_at,
        status,
        created_at,
        updated_at
      )
    `
    )
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching completed reviews: ${error.message}`);
  }

  return reviews as (Review & { projects: Project[] })[];
}
