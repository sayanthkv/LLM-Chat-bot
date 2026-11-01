// server/src/schemas/resumeSchema.ts
import { z } from "zod";

export const ExperienceLevelEnum = z.enum([
  "ENTRY",
  "MID",
  "SENIOR",
  "LEAD",
]);

export const workExperienceSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Role/Title is required"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  keyHighlights: z
    .array(z.string())
    .min(1, "At least one highlight or responsibility is required"),
});

export const educationSchema = z.object({
  institution: z.string().min(1, "Institution name is required"),
  degree: z.string().min(1, "Degree or certification is required"),
  // z.coerce.number() safely converts "2022" -> 2022
  graduationYear: z.coerce
    .number()
    .int()
    .min(1950, "Graduation year must be valid")
    .max(2035, "Graduation year cannot be too far in the future")
    .nullable()
    .optional(),
});

export const resumeSchema = z.object({
  candidateName: z.string().min(2, "Candidate name must be at least 2 characters"),
  email: z.string().email("Invalid email format").nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  summary: z.string().max(500, "Summary cannot exceed 500 characters").nullable().optional(),
  experienceLevel: ExperienceLevelEnum,
  technicalSkills: z
    .array(z.string().min(1))
    .min(1, "At least one technical skill is required"),
  workExperience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
});

export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type ParsedResume = z.infer<typeof resumeSchema>;