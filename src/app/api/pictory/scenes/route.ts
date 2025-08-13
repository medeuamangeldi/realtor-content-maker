/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const { CLIENT_ID, CLIENT_SECRET, X_PICTORY_USER_ID, OPENAI_API_KEY } =
  process.env;
const API_ENDPOINT = "https://api.pictory.ai";

// --- Pictory headers
const headers = (token: string) => ({
  Authorization: token,
  "X-Pictory-User-Id": X_PICTORY_USER_ID!,
  "Content-Type": "application/json",
});

// --- Get Pictory access token
async function getAccessToken(): Promise<string> {
  const res = await axios.post(`${API_ENDPOINT}/pictoryapis/v1/oauth2/token`, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  return res.data.access_token;
}

// --- Create storyboard
async function createStoryboard(
  token: string,
  scenes: { text: string; voiceOver: boolean }[]
) {
  const res = await axios.post(
    `${API_ENDPOINT}/pictoryapis/v1/video/storyboard`,
    {
      videoName: "GeneratedVideo",
      videoWidth: 720,
      videoHeight: 1280,
      language: "en",
      audio: {
        autoBackgroundMusic: true,
        backGroundMusicVolume: 0.5,
        aiVoiceOvers: [{ speaker: "Charlie" }],
      },
      scenes: scenes.map((s) => ({
        text: s.text,
        voiceOver: s.voiceOver,
        splitTextOnPeriod: s.voiceOver,
        splitTextOnNewLine: false,
      })),
    },
    { headers: headers(token) }
  );
  return res.data.data.job_id;
}

// --- Poll storyboard status
async function pollStoryboardJobStatus(jobId: string, token: string) {
  const url = `${API_ENDPOINT}/pictoryapis/v1/jobs/${jobId}`;
  let renderParams = null;
  do {
    const res = await axios.get(url, { headers: headers(token) });
    renderParams = res.data.data.renderParams;
    if (renderParams) return renderParams;
    await new Promise((r) => setTimeout(r, 5000));
  } while (!renderParams);
}

// --- Trigger video render
async function renderVideo(token: string, storyboardJobId: string) {
  const res = await axios.put(
    `${API_ENDPOINT}/pictoryapis/v1/video/render/${storyboardJobId}`,
    { webhook: "" },
    { headers: headers(token) }
  );
  return res.data.data.job_id;
}

// --- Poll render job
async function pollRenderVideoJobStatus(jobId: string, token: string) {
  const url = `${API_ENDPOINT}/pictoryapis/v1/jobs/${jobId}`;
  let status = "";
  do {
    const res = await axios.get(url, { headers: headers(token) });
    status = res.data.data.status;
    if (status === "completed") return res.data.data;
    if (status === "Failed") throw new Error("Render job failed");
    await new Promise((r) => setTimeout(r, 5000));
  } while (status !== "completed");
}

// --- OpenAI GPT scene generator
async function generateScenesFromScenario(scenario: string) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Break this scenario, for a Dubai realtor making content to attract users, into 5 short scenes suitable for a short video (max 30 seconds). Use all info if provided (sqft, price, location etc.). Return a JSON array in this format: [{"text":"Scene text","voiceOver":true/false}]. 
If the scene is purely visual (like aerial shots, views, transitions), set voiceOver:false. 
If the scene involves realtor speaking or describing the apartment, set voiceOver:true.

Scenario: ${scenario}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  let scenes: { text: string; voiceOver: boolean }[] = [];
  const content = res.data.choices[0].message.content;

  // Remove code blocks if GPT wraps output in ```json
  const cleaned = content.replace(/```(json)?/g, "").trim();

  try {
    scenes = JSON.parse(cleaned);
  } catch {
    // fallback: split by lines, default voiceOver to true
    scenes = cleaned
      .split("\n")
      .filter(Boolean)
      .map((t: string) => ({ text: t.replace(/^,\s*/, ""), voiceOver: true }));
  }

  console.log("Generated scenes:", scenes);
  return scenes;
}

// --- Main POST handler
export const POST = async (req: NextRequest) => {
  try {
    const { scenario } = await req.json();
    if (!scenario)
      return NextResponse.json({ error: "Scenario required" }, { status: 400 });

    // 1) Generate scenes from scenario
    const scenes = await generateScenesFromScenario(scenario);

    // 2) Get Pictory token
    const token = await getAccessToken();

    // 3) Create storyboard
    const storyboardJobId = await createStoryboard(token, scenes);

    console.log("Storyboard Job ID:", storyboardJobId);

    // 4) Poll storyboard
    await pollStoryboardJobStatus(storyboardJobId, token);

    // 5) Render video
    const renderJobId = await renderVideo(token, storyboardJobId);

    // 6) Poll render
    const videoData = await pollRenderVideoJobStatus(renderJobId, token);

    console.log("Video Data:", videoData);

    return NextResponse.json({
      videoUrl: videoData.videoURL,
      scenes,
      jobId: renderJobId,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 }
    );
  }
};
