// server/src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";

// 1. General API rate limiter (protects health check, read endpoints)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// 2. Strict limiter for AI generation endpoints (/api/chat, /api/extract)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // Max 5 AI requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "AI usage limit reached. Please wait a minute before making more requests.",
  },
});