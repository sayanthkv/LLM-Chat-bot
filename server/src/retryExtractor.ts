// server/src/retryExtractor.ts
import { ai } from "./lib/gemini";
import { parseAndValidateResume, ExtractionResult } from "./extractor";
import { RESUME_SYSTEM_INSTRUCTION, FEW_SHOT_EXAMPLES } from "./prompts/resumePrompt";

export async function extractWithRetry(
  resumeText: string,
  maxRetries: number = 2
): Promise<ExtractionResult> {
  // Construct conversation history seeded with few-shot examples
  const history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  // 1. Inject Few-Shot Examples
  for (const example of FEW_SHOT_EXAMPLES) {
    history.push({
      role: "user",
      parts: [{ text: `Extract resume data from this text:\n\n${example.input}` }],
    });
    history.push({
      role: "model",
      parts: [{ text: example.output }],
    });
  }

  // 2. Append the target candidate text
  history.push({
    role: "user",
    parts: [{ text: `Extract resume data from this text:\n\n${resumeText}` }],
  });

  let attempts = 0;

  while (attempts <= maxRetries) {
    attempts++;
    console.log(`\n[Attempt ${attempts}/${maxRetries + 1}] Invoking Gemini extraction (Few-Shot)...`);

    let rawOutput = "";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: history,
        config: {
          systemInstruction: RESUME_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      rawOutput = response.text || "";
    } catch (apiError: unknown) {
      const errMessage = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(`[Attempt ${attempts}] API Call Error:`, errMessage);

      return {
        success: false,
        error: `LLM API Error: ${errMessage}`,
        rawOutput: "",
      };
    }

    history.push({
      role: "model",
      parts: [{ text: rawOutput }],
    });

    const validationResult = parseAndValidateResume(rawOutput);

    if (validationResult.success) {
      console.log(`[Attempt ${attempts}] Validation PASSED!`);
      return validationResult;
    }

    console.warn(`[Attempt ${attempts}] Validation FAILED.`);
    console.warn("Zod Error Details:", JSON.stringify(validationResult.zodErrors, null, 2));

    if (attempts <= maxRetries) {
      const correctionPrompt = `
Your previous JSON output failed schema validation with the following Zod errors:
${JSON.stringify(validationResult.zodErrors, null, 2)}

Please fix these exact fields and provide a revised, fully compliant JSON object.
`;
      console.log(`Sending feedback to Gemini for correction...`);
      history.push({
        role: "user",
        parts: [{ text: correctionPrompt }],
      });
    }
  }

  return {
    success: false,
    error: `Exceeded maximum retries (${maxRetries}). Schema validation could not be satisfied.`,
    rawOutput: history[history.length - 1]?.parts[0]?.text || "",
  };
}