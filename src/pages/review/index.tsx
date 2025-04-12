import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CiSaveUp2, CiEdit } from "react-icons/ci";
import { MdOutlineCancel } from "react-icons/md";
import { Project } from "@/src/utils/types";

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
        const response = await fetch(
          `https://agent-backend-bvq5.onrender.com/review/${reviewId}/projects`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch review data");
        }
        const reviewData = await response.json();
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
      formData.append("title", reviewTitle);
      formData.append("file", file);

      const response = await fetch(
        "https://agent-backend-bvq5.onrender.com/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start AI review");
      }

      const data = await response.json();

      // Store the review ID in localStorage
      localStorage.setItem("currentReviewId", data.review_id);

      // Update the state with the received projects
      setProjects(data.projects || []);
      setCurrentStep(2);
      setCompletedSteps([1]);
      await fetchReviewData();
      toast.success("AI Review completed successfully!");
    } catch (error) {
      console.error("Error starting AI review:", error);
      toast.error("Failed to start AI review. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProjectScore = async (projectId: string, score: number) => {
    try {
      const response = await fetch(
        `https://agent-backend-bvq5.onrender.com/project/{${projectId}}/human-score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ human_score: score }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update project score");
      }

      const updatedProject = await response.json();

      // Update the project in the local state
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === projectId ? updatedProject : project
        )
      );
    } catch (error) {
      console.error("Error updating project score:", error);
      toast.error("Failed to update score. Please try again.");
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
      if (Object.keys(projectScores).length === 0) {
        toast.warning("No scores to save");
        return;
      }

      // Update each project score individually
      for (const [projectId, score] of Object.entries(projectScores)) {
        await updateProjectScore(projectId, parseInt(score));
      }

      setIsEditing(false);
      setProjectScores({});
      await fetchReviewData();
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
      const reviewId = localStorage.getItem("currentReviewId");
      if (!reviewId) {
        toast.error("No active review found. Please start a new review.");
        return;
      }

      // Check if there are any unsaved changes
      if (Object.keys(projectScores).length > 0) {
        const shouldSave = window.confirm(
          "You have unsaved changes. Would you like to save them before submitting?"
        );
        if (shouldSave) {
          await handleSaveAllScores();
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

  // Define the handleEditClick function
  const handleEditClick = async () => {
    setIsEditing(true);
    try {
      await fetchReviewData();
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
            <h2 className="text-xl  mb-4">AI Review</h2>
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
            <h2 className="text-xl  mb-4">Human Review</h2>
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
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-gray-800 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-400">
                          AI Score:{" "}
                          {/* @ts-expect-error */}
                          {project.analysis?.analysis?.code_quality
                            ?.overall_score || "N/A"}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                projectScores[project.id] ||
                                project.human_score ||
                                ""
                              }
                              onChange={(e) =>
                                handleScoreChange(project.id, e.target.value)
                              }
                              className="w-20 p-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                              placeholder="Score"
                            />
                            <span className="text-sm text-gray-400">/100</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
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
                      <div>
                        <h3 className="text-lg font-medium">
                          {project.project_name}
                        </h3>
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
                    {project.analysis?.celo_integration && (
                      <div className="text-sm text-gray-400">
                        Celo Integration:{" "}
                        {project.analysis.celo_integration.integrated
                          ? "Yes"
                          : "No"}
                        {project.analysis.celo_integration.evidence && (
                          <p className="mt-1 text-gray-500">
                            Evidence:{" "}
                            {project.analysis.celo_integration.evidence}
                          </p>
                        )}
                      </div>
                    )}
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
