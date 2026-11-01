// server/src/test-step5.ts
import dotenv from "dotenv";
dotenv.config();

import { extractWithRetry } from "./retryExtractor";

// A resume with borderline or missing structure
const ambiguousResume = `
Name: Dev Smith
I have been building web projects for about 4 years with React and Node.
Previously worked at DevStudio doing frontend features and bug fixing.
Degree in Computer Applications from City College.
`;

// A completely unviable input (intentional persistent failure)
const completelyBrokenInput = `
Just a shopping list:
- Apples
- Bananas
- Milk
`;

async function runStep5Tests() {
  console.log("==================================================");
  console.log("TEST 1: Ambiguous Resume (Testing Self-Correction)");
  console.log("==================================================");
  const result1 = await extractWithRetry(ambiguousResume, 2);
  console.log("\nFinal Result 1:", result1.success ? "SUCCESS" : "FAILURE");
  if (result1.data) {
    console.log("Extracted Candidate:", result1.data.candidateName);
    console.log("Skills:", result1.data.technicalSkills);
    console.log("Experience Count:", result1.data.workExperience.length);
  }

  console.log("\n==================================================");
  console.log("TEST 2: Invalid Content (Exceeding Retries Gracefully)");
  console.log("==================================================");
  const result2 = await extractWithRetry(completelyBrokenInput, 2);
  console.log("\nFinal Result 2:", result2.success ? "SUCCESS" : "FAILURE");
  console.log("Handled Error:", result2.error);
}

runStep5Tests();