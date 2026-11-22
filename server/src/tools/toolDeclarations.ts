// server/src/tools/toolDeclarations.ts
import { FunctionDeclaration, Type } from "@google/genai";

export const candidateToolDeclarations: FunctionDeclaration[] = [
  {
    name: "getCandidateCount",
    description:
      "Counts the total number of extracted candidates in the database. Optionally filters by a specific technical skill (e.g., 'React', 'Node.js', 'Python') and/or experience level ('ENTRY', 'MID', 'SENIOR', 'LEAD'). Use this whenever the user asks 'how many' or wants a count.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        skill: {
          type: Type.STRING,
          description:
            "Optional single technical skill to filter by, e.g. 'React', 'TypeScript', 'MongoDB'.",
        },
        experienceLevel: {
          type: Type.STRING,
          enum: ["ENTRY", "MID", "SENIOR", "LEAD"],
          description:
            "Optional seniority tier to filter by: ENTRY, MID, SENIOR, or LEAD.",
        },
      },
    },
  },
  {
    name: "searchCandidates",
    description:
      "Finds and returns up to 5 matching candidate profiles (name, email, experience level, location, top skills) filtered by a technical skill and/or experience level. Use this when the user asks who knows a skill or asks for a list of candidates matching criteria.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        skill: {
          type: Type.STRING,
          description:
            "Optional technical skill to match, e.g. 'React', 'Docker', 'AWS'.",
        },
        experienceLevel: {
          type: Type.STRING,
          enum: ["ENTRY", "MID", "SENIOR", "LEAD"],
          description:
            "Optional seniority tier: ENTRY, MID, SENIOR, or LEAD.",
        },
      },
    },
  },
  {
    name: "getCandidateByName",
    description:
      "Retrieves detailed profile information (skills, work experience, education, summary, contact details) for a specific candidate by their full or partial name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Full or partial name of the candidate to look up.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "listRecentExtractions",
    description:
      "Lists the most recently added/extracted candidates in chronological order (newest first). Use this when the user asks about latest resumes or recent uploads.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.INTEGER,
          description:
            "Number of recent candidates to return. Must be an integer between 1 and 10 (default is 5).",
        },
      },
    },
  },
];