/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function PictoryPage() {
  const [scenario, setScenario] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [scenes, setScenes] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const handleGenerate = async () => {
    setLoading(true);
    setVideoUrl("");
    setScenes([]);
    setJobId(null);
    setProgress(0);

    // Start fake progress
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.floor(Math.random() * 1) + 1);
      if (current >= 96) current = 99;
      setProgress(current);
    }, 2000);

    try {
      const res = await fetch("/api/pictory/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();

      if (data.jobId) setJobId(data.jobId);
      if (data.scenes) setScenes(data.scenes);

      // Stop fake progress and jump to 100%
      clearInterval(interval);
      setProgress(100);

      if (data.videoUrl) setVideoUrl(data.videoUrl);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      alert("Error generating video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div
        className="card shadow-lg p-4 rounded-4 w-100"
        style={{ maxWidth: "900px" }}
      >
        <h1 className="text-center mb-4 fw-bold display-6">
          Realtor Content Video Generator
        </h1>

        <textarea
          className="form-control rounded-3 p-3 mb-3 shadow-sm"
          rows={6}
          placeholder="Describe your apartment scenario..."
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        />

        <div className="d-flex justify-content-center mb-3">
          <button
            className="btn px-5 py-2 shadow-sm"
            onClick={handleGenerate}
            disabled={loading || !scenario.trim()}
            style={{
              background: "linear-gradient(90deg, #8e2de2, #ff416c)",
              color: "white",
              fontWeight: 600,
              borderRadius: "12px",
              transition: "all 0.3s",
            }}
          >
            {loading && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
            )}
            {loading ? "Generating..." : "Generate Video"}
          </button>
        </div>

        {jobId && (
          <div className="text-center text-muted mb-3">
            Job ID: <code>{jobId}</code>
          </div>
        )}

        {/* Fake Progress Bar */}
        {loading && (
          <div className="mb-3">
            <div className="progress" style={{ height: "20px" }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {progress}%
              </div>
            </div>
          </div>
        )}

        {/* Scenes */}
        {scenes.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-3 fw-semibold">Scene Preview</h3>
            <div
              className="d-flex flex-wrap gap-3"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {scenes.map((scene, idx) => (
                <div
                  key={idx}
                  className="p-3 border-start shadow-sm flex-grow-1"
                  style={{
                    minWidth: "200px",
                    borderLeftWidth: "5px",
                    borderLeftColor: scene.voiceOver ? "#8e2de2" : "#dee2e6",
                    backgroundColor: scene.voiceOver ? "#f3e8ff" : "#f8f9fa",
                    borderRadius: "10px",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e: any) =>
                    (e.currentTarget.style.transform = "scale(1.03)")
                  }
                  onMouseLeave={(e: any) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <p className="mb-1 fw-medium">{scene.text}</p>
                  <small className="text-muted">
                    VoiceOver: {scene.voiceOver ? "Yes" : "No"}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video */}
        {videoUrl && (
          <div className="text-center">
            <h3 className="mb-3 fw-bold">Generated Video</h3>
            <div
              className="mx-auto border rounded-3 shadow-lg overflow-hidden"
              style={{ width: "270px", maxWidth: "400px", aspectRatio: "9/16" }}
            >
              <video
                src={videoUrl}
                controls
                className="w-100 h-100 object-fit-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
