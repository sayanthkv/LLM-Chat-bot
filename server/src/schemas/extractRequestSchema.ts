import { z } from "zod";

export const extractRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(50, "Resume text is too short (minimum 50 characters required)")
    .max(20000, "Resume text is too long (maximum 20,000 characters allowed)"),
});

export type ExtractRequestBody = z.infer<typeof extractRequestSchema>;