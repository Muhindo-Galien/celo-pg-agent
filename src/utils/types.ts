export interface Review {
  id: string;
  title: string;
  created_at: string;
  status: "pending" | "completed";
  updated_at: string;
}

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