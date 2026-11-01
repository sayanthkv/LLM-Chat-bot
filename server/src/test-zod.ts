// server/src/test-zod.ts
import { z } from "zod";

// 1. Define the blueprint (Schema)
const candidateSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  yearsOfExperience: z.number().nonnegative("Years of experience cannot be negative"),
  skills: z.array(z.string()).min(1, "Must list at least one skill"),
  isEmployed: z.boolean(),
});

// 2. Automatically generate the TypeScript type from the blueprint
type Candidate = z.infer<typeof candidateSchema>;

// Helper function to safely validate and print results
function testValidation(label: string, dataToTest: unknown): void {
  console.log(`\n--- Running Test: ${label} ---`);

  // safeParse returns a result object instead of throwing an error
  const result = candidateSchema.safeParse(dataToTest);

  if (result.success) {
    // result.data is fully typed as 'Candidate'
    const validCandidate: Candidate = result.data;
    console.log("Validation PASSED!");
    console.log("Clean data:", validCandidate);
  } else {
    console.log("Validation FAILED!");
    // format() or errors gives readable explanations of what failed
    console.log("Errors:", JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  }
}

// Case A: Perfect data (Valid)
const validCandidateData = {
  fullName: "Sayanth Sajeevan",
  email: "sayanth@example.com",
  yearsOfExperience: 1,
  skills: ["React", "Node.js", "TypeScript"],
  isEmployed: true,
};

// Case B: Messy/bad data (Invalid)
const invalidCandidateData = {
  fullName: "S",                      // Too short (min 2)
  email: "not-an-email",              // Not an email format
  yearsOfExperience: -3,              // Negative number
  skills: [],                         // Empty array (min 1 required)
  isEmployed: "yes",                  // String instead of boolean
};

// Execute tests
testValidation("Valid Candidate", validCandidateData);
testValidation("Invalid Candidate", invalidCandidateData);