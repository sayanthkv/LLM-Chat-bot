// server/src/routes/extractRoutes.ts
import { Router, Request, Response } from "express";
import { extractRequestSchema } from "../schemas/extractRequestSchema";
import { extractWithRetry } from "../retryExtractor";
import { Extraction } from "../models/Extraction";

const router = Router();

// POST /api/extract - Parses resume, validates with Zod, saves to MongoDB
router.post("/extract", async (req: Request, res: Response): Promise<void> => {
  try {
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

    // Run extraction with Zod auto-retry
    const extractionResult = await extractWithRetry(text, 2);

    if (!extractionResult.success || !extractionResult.data) {
      res.status(422).json({
        success: false,
        error: extractionResult.error || "Failed to extract valid resume data",
        zodErrors: extractionResult.zodErrors,
      });
      return;
    }

    // Save validated candidate to MongoDB
    const savedRecord = await Extraction.create({
      rawText: text,
      candidate: extractionResult.data,
    });

    res.status(200).json({
      success: true,
      data: savedRecord,
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

// GET /api/extractions - Retrieve all saved candidate profiles
router.get("/extractions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await Extraction.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error fetching extractions:", message);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve extractions",
    });
  }
});

export default router;