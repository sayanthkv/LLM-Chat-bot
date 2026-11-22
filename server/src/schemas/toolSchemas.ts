// server/src/schemas/toolSchemas.ts
import { z } from "zod";
import { ExperienceLevelEnum } from "./resumeSchema";

// Normalize lowercase/mixed-case experience levels (e.g., "senior" -> "SENIOR") before enum check
const NormalizedExperienceLevel = z.preprocess(
  (val) => (typeof val === "string" ? val.trim().toUpperCase() : val),
  ExperienceLevelEnum
);

export const getCandidateCountArgsSchema = z.object({
  skill: z
    .string()
    .trim()
    .min(1, "Skill cannot be empty")
    .max(60, "Skill name is too long")
    .optional(),
  experienceLevel: NormalizedExperienceLevel.optional(),
});

export const searchCandidatesArgsSchema = z.object({
  skill: z
    .string()
    .trim()
    .min(1, "Skill cannot be empty")
    .max(60, "Skill name is too long")
    .optional(),
  experienceLevel: NormalizedExperienceLevel.optional(),
});

export const getCandidateByNameArgsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
});

export const listRecentExtractionsArgsSchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(10, "Limit cannot exceed 10")
    .optional()
    .default(5),
});

export type ToolName =
  | "getCandidateCount"
  | "searchCandidates"
  | "getCandidateByName"
  | "listRecentExtractions";

export interface ToolExecutionResult {
  ok: boolean;
  toolName: string;
  data?: unknown;
  error?: string;
}