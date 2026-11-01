// server/src/test-step4.ts
import dotenv from "dotenv";
dotenv.config();

import { ai } from "./lib/gemini";
import { parseAndValidateResume } from "./extractor";

const SYSTEM_INSTRUCTION = `
You are an expert AI Resume Data Extractor.
Extract the candidate's details into a clean, structured JSON object matching this blueprint:
{
  "candidateName": string (at least 2 chars),
  "email": string (optional),
  "phone": string (optional),
  "location": string (optional),
  "summary": string (optional, under 500 chars),
  "experienceLevel": strictly one of ["ENTRY", "MID", "SENIOR", "LEAD"],
  "technicalSkills": array of strings (at least 1 required),
  "workExperience": array of objects with "company", "role", "keyHighlights" (at least 1 highlight),
  "education": array of objects with "institution", "degree", "graduationYear"
}
Output raw JSON only.
`;

async function testExtraction(label: string, resumeText: string) {
  console.log(`\n==================================================`);
  console.log(`RUNNING TEST: ${label}`);
  console.log(`==================================================`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Extract the resume data from this text:\n\n${resumeText}` }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const rawOutput = response.text || "";
    console.log("Raw LLM Output received. Now validating with Zod...");

    const result = parseAndValidateResume(rawOutput);

    if (result.success && result.data) {
      console.log("\n Extraction & Validation: PASSED!");
      console.log("Candidate Name:", result.data.candidateName);
      console.log("Experience Level:", result.data.experienceLevel);
      console.log("Skills:", result.data.technicalSkills);
      console.log("Work Experience Count:", result.data.workExperience.length);
    } else {
      console.log("\n Extraction & Validation: FAILED!");
      console.log("Error Reason:", result.error);
      console.log("Field-level Zod issues:\n", JSON.stringify(result.zodErrors, null, 2));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Network or API Error:", msg);
  }
}

// Case A: Real, full resume (Should PASS)
const validResume = `
Jordan Lee
jordan.lee@devmail.io | Austin, TX
Full-stack software developer with 3 years building web apps.

Experience:
Full Stack Engineer at Austin Cloud Labs (2023 - Present)
- Built microservices using Node.js and TypeScript.
- Optimized MongoDB queries, reducing response times by 40%.

Skills: TypeScript, Node.js, React, MongoDB, Docker

Education:
University of Texas at Austin, B.S. in Computer Science (2022)
`;

// Case B: Tricky/Incomplete text (Should FAIL Zod validation)
// Bob has no technical skills and no work experience with highlights!
const invalidResume = `
Hi, I'm Bob. I love playing football and guitar. 
Contact me at bob@gmail.com.
`;

async function runAll() {
  await testExtraction("Valid Full Resume", validResume);
  await testExtraction("Incomplete Input (Bob's text)", invalidResume);
}

runAll();