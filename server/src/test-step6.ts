// server/src/test-step6.ts
import dotenv from "dotenv";
dotenv.config();

import { extractWithRetry } from "./retryExtractor";

// A resume that lacks explicit dates and structured sections
const trickyResume = `
Rahul Sharma
rahul.sharma@techmail.com - Kozhikode, Kerala
Junior MERN Stack Developer with 1.5 years experience building web applications.

Experience:
Softroniics (Intern / Associate Developer)
- Built job portal with React, Express, and MongoDB.
- Created REST APIs with JWT authentication.

Tech Skills: JavaScript, TypeScript, React, Node.js, Express, MongoDB, Tailwind CSS

Education:
BCA from Calicut University
`;

async function testStep6() {
  console.log("==================================================");
  console.log("TESTING FEW-SHOT RESUME EXTRACTION");
  console.log("==================================================");

  const result = await extractWithRetry(trickyResume, 2);

  if (result.success && result.data) {
    console.log("\n Extraction Successful!");
    console.log("Candidate:", result.data.candidateName);
    console.log("Experience Level:", result.data.experienceLevel);
    console.log("Extracted Skills:", result.data.technicalSkills);
    console.log("Education Details:", result.data.education);
    console.log("Work History:", result.data.workExperience);
  } else {
    console.error("\n Extraction Failed:", result.error);
  }
}

testStep6();