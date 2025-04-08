
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Project, getReviewWithProjects } from "../../lib/supabase";
import { supabase } from "../../lib/supabase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CiSaveUp2, CiEdit } from "react-icons/ci";
import { MdOutlineCancel } from "react-icons/md";

export default function ReviewPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectScores, setProjectScores] = useState<{ [key: string]: string }>(
    {}
  );
  const [isEditing, setIsEditing] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Define fetchReviewData function
  const fetchReviewData = async () => {
    try {
      setError(null);
      const reviewId = localStorage.getItem("currentReviewId");
      if (reviewId) {
        const reviewData = await getReviewWithProjects(reviewId);
        setProjects(reviewData.projects);
        setReviewTitle(reviewData.title);

        if (reviewData.projects.length > 0) {
          setCurrentStep(2);
          setCompletedSteps([1]);
        }
      }
    } catch (error) {
      console.error("Error fetching review data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load review data"
      );
      localStorage.removeItem("currentReviewId");
    }
  };

  // Fetch review data when component mounts
  useEffect(() => {
    fetchReviewData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if file is XLSX
      if (!selectedFile.name.endsWith(".xlsx")) {
        alert("Please upload only XLSX files");
        e.target.value = ""; // Clear the input
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleStartAIReview = async () => {
    if (!file || !reviewTitle) return;
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", reviewTitle);

      console.log("==========start==========");

      const response = await fetch("/api/review/start", {
        method: "POST",
        body: formData,
      });
        
      if (!response.ok) {
        throw new Error("Failed to start AI review");
      }
      console.log(`========================================`);
      console.log("response", response);
      console.log(`========================================`);

      const data = await response.json();
      localStorage.setItem("currentReviewId", data.reviewId);
      setProjects(data.projects || []);
      setCurrentStep(3);
      setCompletedSteps([1]);

      // Update review status to pending after AI review
      const { error: updateError } = await supabase
        .from("reviews")
        .update({ status: "pending" })
        .eq("id", data.reviewId);

      if (updateError) {
        console.error("Error updating review status:", updateError);
        toast.error("Failed to update review status");
      } else {
        toast.success("AI Review completed successfully!");
      }
    } catch (error) {
      console.error("Error starting AI review:", error);
      toast.error("Failed to start AI review. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (projectId: string, value: string) => {
    const numericValue = parseInt(value);
    if (numericValue >= 0 && numericValue <= 100) {
      // Only update the local state, don't save to database yet
      setProjectScores((prev) => ({
        ...prev,
        [projectId]: value,
      }));
    }
  };

  const handleSaveAllScores = async () => {
    setIsLoading(true);
    try {
      // Validate that we have scores to save
      if (Object.keys(projectScores).length === 0) {
        toast.warning("No scores to save");
        return;
      }

      // Get the current review ID
      const reviewId = localStorage.getItem("currentReviewId");
      if (!reviewId) {
        toast.error("Review ID not found. Please try again.");
        return;
      }

      // First, fetch all projects for this review
      const { data: reviewProjects, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("review_id", reviewId);

      if (fetchError) {
        throw new Error(`Error fetching projects: ${fetchError.message}`);
      }

      if (!reviewProjects || reviewProjects.length === 0) {
        throw new Error("No projects found for this review");
      }

      // Create a map of project IDs to their scores
      const projectIdToScore = new Map(
        Object.entries(projectScores).map(([id, score]) => [
          id,
          parseInt(score),
        ])
      );

      // Update each project with its new score
      const updatePromises = reviewProjects.map(async (project) => {
        const newScore = projectIdToScore.get(project.id);
        if (newScore === undefined) return; // Skip if no new score for this project

        if (isNaN(newScore) || newScore <= 0 || newScore > 100) {
          throw new Error(
            `Invalid score for project ${project.project_name}. Score must be between 1 and 100.`
          );
        }

        // Calculate final score as average of AI score and human score
        const aiScore = project.analysis.code_quality.overall_score;
        const finalScore = Math.round((aiScore + newScore) / 2);

        // Update the project
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            human_score: newScore,
            final_score: finalScore,
            scored_by: "user@example.com",
            scored_at: new Date().toISOString(),
          })
          .eq("id", project.id);

        if (updateError) {
          throw new Error(
            `Error updating score for project ${project.project_name}: ${updateError.message}`
          );
        }

        console.log(
          `Successfully updated score for project ${project.project_name}:`
        );
        console.log("Human Score:", newScore);
        console.log("AI Score:", aiScore);
        console.log("Final Score:", finalScore);
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Refresh the projects data
      const reviewData = await getReviewWithProjects(reviewId);
      if (!reviewData) {
        throw new Error("Failed to fetch updated review data");
      }
      setProjects(reviewData.projects);

      setIsEditing(false);
      setProjectScores({});
      toast.success("All scores saved successfully!");
    } catch (error) {
      console.error("Error saving scores:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save changes. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setProjectScores({});
  };

  const handleSubmitReview = async () => {
    setIsLoading(true);
    try {
      // First check if there are any unsaved changes
      if (Object.keys(projectScores).length > 0) {
        const shouldSave = window.confirm(
          "You have unsaved changes. Would you like to save them before submitting?"
        );
        if (shouldSave) {
          await handleSaveAllScores();
        }
      }

      // Update review status to completed
      const reviewId = localStorage.getItem("currentReviewId");
      if (reviewId) {
        const { error: updateError } = await supabase
          .from("reviews")
          .update({ status: "completed" })
          .eq("id", reviewId);

        if (updateError) {
          throw new Error(
            `Error updating review status: ${updateError.message}`
          );
        }
      }

      toast.success("Review submitted successfully!");
      // Clear localStorage and reset state
      localStorage.removeItem("currentReviewId");
      setCurrentStep(1);
      setCompletedSteps([]);
      setProjects([]);
      setProjectScores({});
      setReviewTitle("");
      setFile(null);
      setIsEditing(false);
      // Redirect to completed page
      router.push("/dashboard/completed");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const allScoresFilled = projects.every(
    (project) => project.human_score !== null
  );

  // Log project properties
  projects.forEach((project: Project, index: number) => {
    console.log(`\nProject ${index + 1}:`);
    console.log("ID:", project.id);
    console.log("Name:", project.project_name);
    console.log("Description:", project.project_description);
    console.log("GitHub URL:", project.project_github_url);
    console.log("Owner GitHub URL:", project.project_owner_github_url);
    console.log("Project URL:", project.project_url);
    console.log("AI Score:", project.analysis.code_quality.overall_score);
    console.log(
      "Celo Integration:",
      project.analysis.celo_integration.integrated
    );
    console.log(
      "Integration Evidence:",
      project.analysis.celo_integration.evidence
    );
    console.log("Human Score:", project.human_score);
    console.log("Final Score:", project.final_score);
    console.log("Created At:", project.created_at);
    console.log("Updated At:", project.updated_at);
    if (project.error) {
      console.log("Error:", project.error);
    }
  });

  // Define the handleEditClick function
  const handleEditClick = async () => {
    setIsEditing(true);
    try {
      await fetchReviewData(); // Refetch the latest review data
    } catch (error) {
      console.error("Error refetching review data:", error);
      toast.error("Failed to fetch the latest review data.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      {/* Progress Steps */}
      <div className="flex justify-between mb-12">
        <div className="flex-1">
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-700">
              <div
                className="h-full transition-all duration-500 ease-in-out"
                style={{
                  width: `${(completedSteps.length / 2) * 100}%`,
                  backgroundColor:
                    completedSteps.length === 2 ? "#22c55e" : "#3b82f6",
                }}
              />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between relative">
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      completedSteps.includes(1)
                        ? "bg-green-500 shadow-lg shadow-green-500/30"
                        : currentStep >= 1
                        ? "bg-blue-500 shadow-lg shadow-blue-500/30"
                        : "bg-gray-700"
                    }`}
                  >
                    <span className="text-sm font-medium">1</span>
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        completedSteps.includes(1)
                          ? "text-green-500"
                          : currentStep >= 1
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    >
                      AI Review
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      completedSteps.includes(2)
                        ? "bg-green-500 shadow-lg shadow-green-500/30"
                        : currentStep >= 2
                        ? "bg-blue-500 shadow-lg shadow-blue-500/30"
                        : "bg-gray-700"
                    }`}
                  >
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        completedSteps.includes(2)
                          ? "text-green-500"
                          : currentStep >= 2
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    >
                      Human Review
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-gray-700/50 rounded-lg p-6 shadow-lg">
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-400 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Error Loading Review
            </h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                localStorage.removeItem("currentReviewId");
                setCurrentStep(1);
                setCompletedSteps([]);
                setProjects([]);
                setReviewTitle("");
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Start New Review
            </button>
          </div>
        ) : currentStep === 1 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">AI Review</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Review Title
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Enter review title"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors duration-300">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-gray-300">
                    {file ? file.name : "Upload XLSX file"}
                  </span>
                  <span className="text-sm text-gray-400 mt-1">
                    Only XLSX files are supported
                  </span>
                </label>
              </div>
              <button
                onClick={handleStartAIReview}
                disabled={!file || !reviewTitle || isLoading}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "Start AI Review"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Human Review</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Projects</h3>
                {!isEditing ? (
                  <button
                    onClick={handleEditClick}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center gap-2"
                  >
                    <CiEdit className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="space-x-2 flex">
                    <button
                      onClick={handleSaveAllScores}
                      disabled={isLoading}
                      className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoading ? (
                        "Saving..."
                      ) : (
                        <>
                          <CiSaveUp2 className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-3 bg-red-500 text-white rounded-full hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center gap-2"
                    >
                      <MdOutlineCancel className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Projects Dashboard */}
              <div className="space-y-4">
                {projects?.map((project, index) => (
                  <div
                    key={project.id || `project-${index}`}
                    className="bg-gray-800 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-1.5">
                          <h4 className="text-lg font-medium">
                            {project.project_name}
                          </h4>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-400">
                              AI Score:{" "}
                              {project.analysis.code_quality.overall_score}
                            </div>
                            {isEditing ? (
                              <div className="mt-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={projectScores[project.id] || ""}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      project.id,
                                      e.target.value
                                    )
                                  }
                                  className="w-20 p-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                                  placeholder="H-Score"
                                />
                                <div className="text-xs text-gray-400 mt-1">
                                  Enter score (0-100)
                                </div>
                              </div>
                            ) : (
                              <div className="">
                                <div className="text-sm text-gray-400">
                                  Human Score:{" "}
                                  {project.human_score !== null
                                    ? project.human_score
                                    : "Not scored"}
                                </div>
                                {project.final_score !== null && (
                                  <div className="text-sm font-medium text-green-400">
                                    Final Score: {project.final_score}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {project.project_description}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
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
              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={handleSubmitReview}
                  disabled={!allScoresFilled || isEditing}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
