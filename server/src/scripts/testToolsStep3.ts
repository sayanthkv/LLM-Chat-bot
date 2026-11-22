// server/src/scripts/testToolsStep3.ts
import dotenv from "dotenv";
import path from "path";
import { ai } from "../lib/gemini";
import { candidateToolDeclarations } from "../tools/toolDeclarations";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MODELS_TO_TRY = [
  process.env.GEMINI_MODEL || "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

async function run() {
  const testPrompt = "How many candidates know React, and who is the most recent candidate added?";
  console.log(`Prompt: "${testPrompt}"\n`);

  let response = null;
  let usedModel = "";

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`Trying model: ${model}...`);
      response = await ai.models.generateContent({
        model,
        contents: testPrompt,
        config: {
          systemInstruction:
            "You are an HR & Recruiting Assistant with read-only access to a candidate resume database via tools. Always use the provided tools to look up candidate facts instead of guessing.",
          tools: [{ functionDeclarations: candidateToolDeclarations }],
          temperature: 0,
        },
      });
      usedModel = model;
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.includes("503") || msg.includes("RESOURCE_EXHAUSTED")) {
        console.warn(`Model ${model} rate-limited or busy, trying next model...`);
        continue;
      }
      throw err;
    }
  }

  if (!response) {
    throw new Error("All models hit rate limits.");
  }

  console.log(`\nSuccess using model: ${usedModel}`);
  console.log("Proposed Function Calls by Gemini:");
  console.dir(response.functionCalls, { depth: null });
}

run().catch((err) => {
  console.error("Step 3 test failed:", err);
  process.exit(1);
});