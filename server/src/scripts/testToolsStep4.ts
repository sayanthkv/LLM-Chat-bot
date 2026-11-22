// server/src/scripts/testToolsStep4.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { askAboutCandidates } from "../services/candidateChatService";

async function run() {
  console.log("Starting Step 4 test...");
  await connectDB();

  const question = "How many candidates know React, and what are Kavya Menon's skills?";
  console.log(`Question: "${question}"\n`);

  const result = await askAboutCandidates(question);

  console.log("\n=== FINAL ANSWER ===");
  console.log(result.answer);
  console.log("\n=== TELEMETRY ===");
  console.log("Model Used:", result.modelUsed);
  console.log("Gemini API Calls Used:", result.geminiCallsCount);
  console.log("Tools Executed:", result.toolsUsed);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Step 4 test failed:", err);
  process.exit(1);
});