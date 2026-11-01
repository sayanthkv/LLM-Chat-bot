// server/src/test-step3.ts
import dotenv from "dotenv";
dotenv.config();

import { ai } from "./lib/gemini";

// A messy, realistic sample of unformatted text from a resume
const sampleMessyResumeText = "My name is Bob. I like sports and music.";

// System prompt defining role, rules, and schema shape
const SYSTEM_INSTRUCTION = `
You are an expert AI Resume Data Extractor.
Your job is to read unformatted, messy resume text and extract the candidate's details into a clean, structured JSON object.

EXTRACTION RULES:
1. Output MUST be a valid JSON object matching this blueprint:
   {
     "candidateName": string (at least 2 characters),
     "email": string or omit if not found,
     "phone": string or omit if not found,
     "location": string or omit if not found,
     "summary": string (concise summary under 500 characters) or omit,
     "experienceLevel": strictly one of ["ENTRY", "MID", "SENIOR", "LEAD"],
     "technicalSkills": array of non-empty strings (at least 1 required),
     "workExperience": array of objects with:
       - "company": string
       - "role": string
       - "startDate": string (optional)
       - "endDate": string (optional, e.g. "Present")
       - "keyHighlights": array of strings (at least 1 item)
     "education": array of objects with:
       - "institution": string
       - "degree": string
       - "graduationYear": integer year (optional)
   }

2. Calculate "experienceLevel":
   - "ENTRY": 0 to 2 years of professional experience
   - "MID": 3 to 5 years
   - "SENIOR": 6 to 9 years
   - "LEAD": 10+ years or leadership titles

3. Do NOT invent or hallucinate information that is not in the text.
4. Output raw JSON only. Do not add markdown code fences, greetings, or explanations.
`;

async function runExtractionCall() {
  console.log("Sending messy text to Gemini for extraction...\n");

  try {
    const response = await ai.models.generateContent({
      model:'gemini-3.5-flash',
      contents: [
        {
          role: "user",
          parts: [{ text: `Extract the resume data from the following text:\n\n${sampleMessyResumeText}` }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Enforce pure JSON response at the API level
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature ensures deterministic, factual output
      },
    });

    const rawOutputText = response.text;

    console.log("================ RAW MODEL OUTPUT ================");
    console.log(rawOutputText);
    console.log("==================================================");

    // Basic JSON syntax check
    if (rawOutputText) {
      const parsedJson = JSON.parse(rawOutputText);
      console.log("\n JSON parse check: Successful!");
      console.log(`Extracted Candidate: ${parsedJson.candidateName}`);
      console.log(`Assigned Level: ${parsedJson.experienceLevel}`);
    } else {
      console.error(" Model returned an empty response string.");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(" Error during LLM extraction call:", message);
  }
}

runExtractionCall();