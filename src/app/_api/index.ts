// api/index.ts
import axios from "axios";

const api = axios.create({
  baseURL: "https://api.pictory.ai", // Pictory's API base
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NEXT_PUBLIC_PICTORY_API_KEY || "", // Secure in env
  },
});

// Step 1: Upload media
export const uploadMedia = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data; // Returns file ID for use in video creation
};

// Step 2: Create video
export const createVideo = async (scenario: string, mediaIds: string[]) => {
  const { data } = await api.post("/video/create", {
    title: "Dubai Property Showcase",
    description: scenario,
    media: mediaIds.map((id) => ({ id, type: "image" })), // can be "video" or "image"
    style: "instagram",
    resolution: "1080x1080", // square for Instagram
  });
  return data; // returns video ID
};

// Step 3: Get video status
export const getVideoStatus = async (videoId: string) => {
  const { data } = await api.get(`/video/status/${videoId}`);
  return data;
};

// Step 4: Download/Preview video
export const getVideoDownloadLink = async (videoId: string) => {
  const { data } = await api.get(`/video/download/${videoId}`);
  return data; // returns a URL
};
