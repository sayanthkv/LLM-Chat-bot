// server/src/test-step2.ts
import { resumeSchema, ParsedResume } from "./schemas/resumeSchema";

function runValidationTest(label: string, payload: unknown): void {
  console.log(`\n========================================`);
  console.log(`TEST: ${label}`);
  console.log(`========================================`);

  const result = resumeSchema.safeParse(payload);

  if (result.success) {
    const validData: ParsedResume = result.data;
    console.log("Status: PASSED");
    console.log("Candidate Name:", validData.candidateName);
    console.log("Experience Level:", validData.experienceLevel);
    console.log("Skills Count:", validData.technicalSkills.length);
    console.log("Companies:", validData.workExperience.map((exp) => exp.company).join(", "));
  } else {
    console.log("Status: FAILED (Expected for invalid input)");
    console.log("Formatted Errors:");
    // Flatten nested Zod errors into an easily readable format
    console.log(JSON.stringify(result.error.format(), null, 2));
  }
}

// Case 1: Valid Parsed Resume
const validResumeInput = {
  candidateName: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "+1-555-0199",
  location: "San Francisco, CA",
  summary: "Full-stack engineer specializing in Node.js, React, and cloud architectures.",
  experienceLevel: "MID",
  technicalSkills: ["TypeScript", "React", "Node.js", "Docker", "MongoDB"],
  workExperience: [
    {
      company: "TechNova Corp",
      role: "Software Engineer",
      startDate: "2024-02",
      endDate: "Present",
      keyHighlights: [
        "Architected real-time streaming chat application with Gemini LLM APIs.",
        "Refactored database queries using embedded schemas, improving latency by 35%.",
      ],
    },
  ],
  education: [
    {
      institution: "State University",
      degree: "Bachelor of Science in Computer Science",
      graduationYear: 2023,
    },
  ],
};

// Case 2: Invalid Parsed Resume (Triggers multiple Zod failures)
const invalidResumeInput = {
  candidateName: "A", // Error: Less than 2 characters
  email: "invalid-email-address", // Error: Invalid email format
  experienceLevel: "SUPER_SENIOR", // Error: Not one of the allowed enum values
  technicalSkills: [], // Error: Empty array (min 1 required)
  workExperience: [
    {
      company: "", // Error: Empty string (min 1 required)
      role: "Developer",
      keyHighlights: [], // Error: Empty highlights (min 1 required)
    },
  ],
  education: [
    {
      institution: "Tech Academy",
      degree: "Bootcamp",
      graduationYear: 1890, // Error: Earlier than 1950
    },
  ],
};

// Run both tests
runValidationTest("Valid Full Resume", validResumeInput);
runValidationTest("Broken Resume Payload", invalidResumeInput);