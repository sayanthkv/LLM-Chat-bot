// server/src/scripts/testToolsStep2.ts
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { executeCandidateTool } from "../tools/candidateTools";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function run() {
  await connectDB();

  console.log("--- VALID INPUTS ---");
  console.log("1. Valid count:", await executeCandidateTool("getCandidateCount", { skill: "React" }));
  console.log("2. Lowercase enum normalization:", await executeCandidateTool("searchCandidates", { experienceLevel: "mid" }));
  console.log("3. Valid name lookup:", await executeCandidateTool("getCandidateByName", { name: "Kavya" }));

  console.log("\n--- INVALID INPUTS (SHOULD FAIL GRACEFULLY) ---");
  console.log("4. Limit > 10:", await executeCandidateTool("listRecentExtractions", { limit: 50 }));
  console.log("5. Invalid experienceLevel:", await executeCandidateTool("searchCandidates", { experienceLevel: "INTERN" }));
  console.log("6. Name too short:", await executeCandidateTool("getCandidateByName", { name: "A" }));
  console.log("7. Unauthorized tool:", await executeCandidateTool("deleteAllCandidates", {}));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});