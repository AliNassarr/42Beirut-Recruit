import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { readFileSync } from "fs";

// Load .env
const envText = readFileSync(".env", "utf-8");
let apiKey = "";
for (const line of envText.split("\n")) {
  if (line.startsWith("GOOGLE_GENERATIVE_AI_API_KEY=")) {
    apiKey = line.split("=")[1].trim().replace(/^["']|["']$/g, "");
  }
}

console.log("Testing Google Gemini API Key. Key exists:", Boolean(apiKey), "Length:", apiKey.length);

if (!apiKey) {
  console.error("No API key found in .env!");
  process.exit(1);
}

const google = createGoogleGenerativeAI({ apiKey });

async function testModel(modelName) {
  try {
    console.log(`Calling ${modelName}...`);
    const model = google(modelName);
    const { text } = await generateText({
      model,
      prompt: 'Write 1 professional engineering CV bullet point about building an HTTP server in C++ using poll(). Output ONLY the bullet point.',
    });
    console.log(`SUCCESS with ${modelName}!\nOutput:\n`, text);
    return true;
  } catch (err) {
    console.error(`Error with ${modelName}:`, err.message);
    return false;
  }
}

async function run() {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  for (const m of models) {
    const ok = await testModel(m);
    if (ok) {
      console.log(`\nOptimal model confirmed: ${m}`);
      break;
    }
  }
}

run();
