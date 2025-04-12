"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string;
  project_name: string;
  project_description: string;
  project_github_url: string;
  project_owner_github_url: string;
  project_url: string;
  analysis: {
    analysis: {
      code_quality: {
        overall_score: number;
        evidence: string[];
        [key: string]: unknown;
      };
      celo_integration: {
        integrated: boolean;
        evidence: string[];
        [key: string]: unknown;
      };
    };
  };
  human_score: number | null;
  final_score: number | null;
  scored_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  projects: Project[];
}

export default function CompletedReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompletedReviews = async () => {
      try {
        const response = await fetch(
          "https://agent-backend-bvq5.onrender.com/reviews"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch completed reviews");
        }
        const data = await response.json();

        // Filter reviews to only include completed ones
        const completedReviews = data.reviews.filter(
          (review: any) => review.review.status === "completed"
        );

        setReviews(completedReviews);
      } catch (error) {
        console.error("Error fetching completed reviews:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load completed reviews"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedReviews();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h2 className="text-red-400 text-lg font-semibold mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }
  console.log("reviews", reviews);
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-0">
      <h1 className="text-xl  mb-6">Completed Reviews</h1>
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No completed reviews found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews
            .sort(
              (a, b) =>
                // @ts-expect-error
                new Date(b.review.updated_at).getTime() -
                // @ts-expect-error
                new Date(a.review.updated_at).getTime()
            )
            .map((review, index) => (
              <div key={index} className="bg-gray-800 rounded p-6">
                <div className="flex justify-between items-center ">
                  <div>
                    <h2 className="text-lg font-medium py-1">
                      {/* @ts-expect-error */}
                      {review?.review.title}
                    </h2>
                  </div>
                  <div className="text-sm text-gray-400">
                    {review.projects.length} projects reviewed
                  </div>
                </div>

                <div className="flex justify-between items-center gap-4 text-sm text-gray-400 mb-4">
                  {/* @ts-expect-error */}
                  <p>Status: {review.review.status}</p>
                  <p>
                    Updated: {/* @ts-expect-error */}
                    {new Date(review.review.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-4">
                  {review.projects
                    .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
                    .map((project) => (
                      <div
                        key={project.id}
                        className="bg-gray-700/50 rounded p-4 space-y-2"
                      >
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-400">
                              AI Score:{" "}
                              {
                                project.analysis?.analysis?.code_quality
                                  ?.overall_score
                              }
                            </div>
                            <div className="text-sm text-gray-400">
                              Human Score: {project.human_score || "Not scored"}
                            </div>
                            {project.final_score !== null && (
                              <div className="text-sm font-medium text-green-400">
                                Final Score: {project.final_score}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">
                              {project.project_name}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {project.project_description}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                          <div>
                            <p>GitHub URL:</p>
                            <a
                              href={project.project_github_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {project.project_github_url}
                            </a>
                          </div>
                          <div>
                            <p>Owner GitHub URL:</p>
                            <a
                              href={project.project_owner_github_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {project.project_owner_github_url ||
                                "Not available"}
                            </a>
                          </div>
                          <div>
                            <p>Project URL:</p>
                            <a
                              href={project.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {project.project_url || "Not available"}
                            </a>
                          </div>
                        </div>

                        {project.analysis?.analysis?.celo_integration && (
                          <div className="text-sm text-gray-400">
                            <p>
                              Celo Integration:{" "}
                              {project.analysis?.analysis?.celo_integration
                                .integrated
                                ? "Yes"
                                : "No"}
                            </p>
                            {project.analysis?.analysis?.celo_integration
                              .evidence.length > 0 && (
                              <p className="mt-1 text-gray-500">
                                Evidence:{" "}
                                {project.analysis?.analysis?.celo_integration.evidence.join(
                                  ", "
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
