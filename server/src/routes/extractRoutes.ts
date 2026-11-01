// server/src/routes/extractRoutes.ts
import { Router, Request, Response } from "express";
import { extractRequestSchema } from "../schemas/extractRequestSchema";
import { extractWithRetry } from "../retryExtractor";

const router = Router();

router.post("/extract", async (req: Request, res: Response): Promise<void> => {
  try {

    console.log("Raw req.headers['content-type']:", req.headers["content-type"]);
    console.log("Received req.body:", req.body);
    // 1. Validate the incoming HTTP body with Zod
    const bodyValidation = extractRequestSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request payload",
        details: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const { text } = bodyValidation.data;

    // 2. Perform LLM Extraction with Few-Shot examples & auto-retry
    const extractionResult = await extractWithRetry(text, 2);

    if (!extractionResult.success) {
      res.status(422).json({
        success: false,
        error: extractionResult.error || "Failed to extract valid resume data",
        zodErrors: extractionResult.zodErrors,
      });
      return;
    }

    // 3. Return the clean, validated JSON to the client
    res.status(200).json({
      success: true,
      data: extractionResult.data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Unhandled error in /api/extract:", message);
    res.status(500).json({
      success: false,
      error: "Internal Server Error during resume extraction",
    });
  }
});


export default router;