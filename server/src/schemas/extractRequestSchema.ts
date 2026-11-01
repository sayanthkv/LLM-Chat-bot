// server/src/schemas/extractRequestSchema.ts
import { z } from "zod";

export const extractRequestSchema = z.object({
  text: z
    .string({
      required_error: "Resume text is required",
      invalid_type_error: "Resume text must be a string",
    })
    .trim()
    .min(50, "Resume text is too short (minimum 50 characters required)")
    .max(20000, "Resume text is too long (maximum 20,000 characters allowed)"),
});

export type ExtractRequestBody = z.infer<typeof extractRequestSchema>;