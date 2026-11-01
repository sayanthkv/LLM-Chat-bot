// server/src/extractor.ts
import { resumeSchema, ParsedResume } from "./schemas/resumeSchema";
import { ZodError } from "zod";

export interface ExtractionResult {
  success: boolean;
  data?: ParsedResume;
  error?: string;
  zodErrors?: Record<string, unknown>;
  rawOutput: string;
}

/**
 * Strips markdown code blocks (```json ... ```) or whitespace around JSON.
 */
export function cleanJsonString(rawText: string): string {
  let cleaned = rawText.trim();

  // If the model wrapped the JSON in markdown code blocks, remove them
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "") // Remove opening ``` or ```json
      .replace(/\n?```\s*$/, "");          // Remove closing ```
  }

  return cleaned.trim();
}

/**
 * Parses raw text into JSON, then validates it using our Zod schema.
 */
export function parseAndValidateResume(rawOutput: string): ExtractionResult {
  const cleaned = cleanJsonString(rawOutput);

  // 1. Check if the string is valid JSON syntax
  let rawParsedObject: unknown;
  try {
    rawParsedObject = JSON.parse(cleaned);
  } catch (jsonErr: unknown) {
    const errorMsg = jsonErr instanceof Error ? jsonErr.message : "Syntax error in JSON string";
    return {
      success: false,
      error: `Failed to parse string as JSON: ${errorMsg}`,
      rawOutput,
    };
  }

  // 2. Validate against our Zod blueprint
  const validationResult = resumeSchema.safeParse(rawParsedObject);

  if (validationResult.success) {
    return {
      success: true,
      data: validationResult.data,
      rawOutput,
    };
  } else {
    // Collect the exact field-level errors
    return {
      success: false,
      error: "Zod Schema Validation Failed",
      zodErrors: validationResult.error.format(),
      rawOutput,
    };
  }
}