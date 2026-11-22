// server/src/scripts/testToolsStep1.ts
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import {
  getCandidateCount,
  searchCandidates,
  getCandidateByName,
  listRecentExtractions,
} from "../tools/candidateTools";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function run() {
  await connectDB();

  console.log("1. Total candidates:", await getCandidateCount({}));
  console.log("2. React candidates count:", await getCandidateCount({ skill: "React" }));
  console.log("3. Search SENIOR or React:", await searchCandidates({ skill: "React" }));
  console.log("4. Recent extractions (limit 3):", await listRecentExtractions({ limit: 3 }));
  console.log("5. Regex safety test (C++):", await getCandidateCount({ skill: "C++" }));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});