// server/src/tools/candidateTools.ts
import { Extraction } from "../models/Extraction";
import { ExperienceLevel } from "../schemas/resumeSchema";
import {
  getCandidateCountArgsSchema,
  searchCandidatesArgsSchema,
  getCandidateByNameArgsSchema,
  listRecentExtractionsArgsSchema,
  ToolExecutionResult,
} from "../schemas/toolSchemas";

/**
 * Escapes special regex characters so user/LLM input like "C++" or "Node.js"
 * is matched literally without breaking MongoDB's $regex engine.
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CandidateSnippet {
  id: string;
  candidateName: string;
  email: string | null;
  experienceLevel: ExperienceLevel;
  location: string | null;
  topSkills: string[];
}

/**
 * Tool 1: Count total candidates, optionally filtered by a technical skill
 * and/or experience level.
 */
export async function getCandidateCount(params: {
  skill?: string;
  experienceLevel?: ExperienceLevel;
}): Promise<{ count: number; filtersApplied: Record<string, string> }> {
  const filter: Record<string, unknown> = {};
  const filtersApplied: Record<string, string> = {};

  if (params.skill && params.skill.trim() !== "") {
    const cleanSkill = params.skill.trim();
    // Exact case-insensitive match inside the technicalSkills array
    filter["candidate.technicalSkills"] = {
      $regex: new RegExp(`^${escapeRegex(cleanSkill)}$`, "i"),
    };
    filtersApplied.skill = cleanSkill;
  }

  if (params.experienceLevel) {
    filter["candidate.experienceLevel"] = params.experienceLevel;
    filtersApplied.experienceLevel = params.experienceLevel;
  }

  const count = await Extraction.countDocuments(filter);
  return { count, filtersApplied };
}

/**
 * Tool 2: Search candidates by skill and/or experienceLevel.
 * Hard-capped at 5 results to keep LLM token usage low.
 */
export async function searchCandidates(params: {
  skill?: string;
  experienceLevel?: ExperienceLevel;
}): Promise<{ totalFound: number; candidates: CandidateSnippet[] }> {
  const filter: Record<string, unknown> = {};

  if (params.skill && params.skill.trim() !== "") {
    filter["candidate.technicalSkills"] = {
      $regex: new RegExp(`^${escapeRegex(params.skill.trim())}$`, "i"),
    };
  }

  if (params.experienceLevel) {
    filter["candidate.experienceLevel"] = params.experienceLevel;
  }

  const docs = await Extraction.find(filter)
    .select(
      "_id candidate.candidateName candidate.email candidate.experienceLevel candidate.location candidate.technicalSkills"
    )
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const candidates: CandidateSnippet[] = docs.map((doc) => ({
    id: String(doc._id),
    candidateName: doc.candidate.candidateName,
    email: doc.candidate.email ?? null,
    experienceLevel: doc.candidate.experienceLevel,
    location: doc.candidate.location ?? null,
    topSkills: (doc.candidate.technicalSkills || []).slice(0, 6),
  }));

  return {
    totalFound: candidates.length,
    candidates,
  };
}

/**
 * Tool 3: Look up a specific candidate by partial or full name (case-insensitive).
 * Returns full structured profile (excluding rawText) for up to 3 matches.
 */
export async function getCandidateByName(params: { name: string }) {
  const cleanName = params.name.trim();
  if (!cleanName) {
    return { matches: [] };
  }

  const docs = await Extraction.find({
    "candidate.candidateName": {
      $regex: new RegExp(escapeRegex(cleanName), "i"),
    },
  })
    .select("-rawText -__v")
    .limit(3)
    .lean();

  return {
    matches: docs.map((doc) => ({
      id: String(doc._id),
      extractedAt: doc.createdAt,
      ...doc.candidate,
    })),
  };
}

/**
 * Tool 4: List the most recently extracted resumes (clamped between 1 and 10).
 */
export async function listRecentExtractions(params: {
  limit?: number;
}): Promise<{ recent: Array<CandidateSnippet & { extractedAt: Date }> }> {
  const rawLimit = params.limit ?? 5;
  const safeLimit = Math.min(Math.max(Math.floor(rawLimit), 1), 10);

  const docs = await Extraction.find({})
    .select(
      "_id createdAt candidate.candidateName candidate.email candidate.experienceLevel candidate.location candidate.technicalSkills"
    )
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  return {
    recent: docs.map((doc) => ({
      id: String(doc._id),
      extractedAt: doc.createdAt,
      candidateName: doc.candidate.candidateName,
      email: doc.candidate.email ?? null,
      experienceLevel: doc.candidate.experienceLevel,
      location: doc.candidate.location ?? null,
      topSkills: (doc.candidate.technicalSkills || []).slice(0, 6),
    })),
  };
}

export async function executeCandidateTool(
  toolName: string,
  rawArgs: unknown
): Promise<ToolExecutionResult> {
  // Gemini sometimes passes undefined/null when all parameters are optional
  const safeInput = rawArgs && typeof rawArgs === "object" ? rawArgs : {};

  try {
    switch (toolName) {
      case "getCandidateCount": {
        const parsed = getCandidateCountArgsSchema.safeParse(safeInput);
        if (!parsed.success) {
          return {
            ok: false,
            toolName,
            error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          };
        }
        const data = await getCandidateCount(parsed.data);
        return { ok: true, toolName, data };
      }

      case "searchCandidates": {
        const parsed = searchCandidatesArgsSchema.safeParse(safeInput);
        if (!parsed.success) {
          return {
            ok: false,
            toolName,
            error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          };
        }
        const data = await searchCandidates(parsed.data);
        return { ok: true, toolName, data };
      }

      case "getCandidateByName": {
        const parsed = getCandidateByNameArgsSchema.safeParse(safeInput);
        if (!parsed.success) {
          return {
            ok: false,
            toolName,
            error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          };
        }
        const data = await getCandidateByName(parsed.data);
        return { ok: true, toolName, data };
      }

      case "listRecentExtractions": {
        const parsed = listRecentExtractionsArgsSchema.safeParse(safeInput);
        if (!parsed.success) {
          return {
            ok: false,
            toolName,
            error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          };
        }
        const data = await listRecentExtractions(parsed.data);
        return { ok: true, toolName, data };
      }

      default:
        return {
          ok: false,
          toolName,
          error: `Unknown or unauthorized tool "${toolName}". Only read-only candidate lookup tools are allowed.`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected database error";
    return {
      ok: false,
      toolName,
      error: `Tool execution failed: ${message}`,
    };
  }
}