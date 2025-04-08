"use client";

import { useState, useEffect } from "react";
import { getCompletedReviews } from "../../lib/supabase";
import { Review, Project } from "../../lib/supabase";

export default function CompletedReviewsPage() {
  const [reviews, setReviews] = useState<(Review & { projects: Project[] })[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompletedReviews = async () => {
      try {
        const completedReviews = await getCompletedReviews();
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Completed Reviews</h1>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No completed reviews found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{review.title}</h2>
                  <p className="text-gray-400 text-sm">
                    Completed on{" "}
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  {review.projects.length} projects reviewed
                </div>
              </div>

              <div className="space-y-4">
                {review.projects
                  .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
                  .map((project) => (
                    <div
                      key={project.id}
                      className="bg-gray-700/50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex flex-col md:flex-row justify-between items-center mb-1.5">
                            <h3 className="text-lg  font-medium mb-4 md:mb-0">
                              {project.project_name}
                            </h3>
                            <div className="flex  text-center gap-4">
                              <div className="text-sm text-gray-400 text-center">
                                AI Score:{" "}
                                {project.analysis.code_quality.overall_score}
                              </div>
                              <div className="text-sm text-gray-400">
                                Human Score: {project.human_score}
                              </div>
                              <div className="text-sm font-medium text-green-400">
                                Final Score: {project.final_score}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {project.project_description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        GitHub:{" "}
                        <a
                          href={project.project_github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {project.project_github_url}
                        </a>
                      </div>
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
