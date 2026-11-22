// server/src/services/candidateChatService.ts
import { Content, Part } from "@google/genai";
import { ai } from "../lib/gemini";
import { candidateToolDeclarations } from "../tools/toolDeclarations";
import { executeCandidateTool } from "../tools/candidateTools";

const MAX_TOOL_ITERATIONS = 4;

export interface ToolTraceItem {
  toolName: string;
  args: unknown;
  ok: boolean;
}

export interface CandidateChatResult {
  answer: string;
  toolsUsed: ToolTraceItem[];
  geminiCallsCount: number;
  modelUsed: string;
}

const SYSTEM_INSTRUCTION = `You are an HR & Recruiting Assistant with read-only access to a candidate resume database via tools.
Rules:
1. Always use the provided tools to look up real candidate numbers, names, and skills. Never guess or invent candidate data.
2. If a user asks you to delete, modify, or overwrite records, politely refuse and explain you only have read-only search access.
3. If a tool returns 0 matches or an empty list, clearly state that no matching candidates were found in the database.
4. Keep answers concise, well-formatted in Markdown, and directly helpful.`;

function getModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const defaults = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

async function callGeminiWithFailover(contents: Content[]) {
  let lastError: unknown;
  const models = getModelCandidates();

  for (const model of models) {
    try {
      console.log(`[CandidateChat] Calling Gemini (${model})...`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: candidateToolDeclarations }],
          temperature: 0.1,
        },
      });
      return { response, modelUsed: model };
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("UNAVAILABLE")
      ) {
        console.warn(`[CandidateChat] Model ${model} rate-limited or busy, failing over...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models are currently unavailable.");
}

async function runMockCandidateChat(prompt: string): Promise<CandidateChatResult> {
  const lower = prompt.toLowerCase();
  const toolsUsed: ToolTraceItem[] = [];

  if (lower.includes("how many") || lower.includes("count")) {
    const skillMatch = lower.includes("react") ? "React" : undefined;
    const args = skillMatch ? { skill: skillMatch } : {};
    const execResult = await executeCandidateTool("getCandidateCount", args);
    toolsUsed.push({ toolName: "getCandidateCount", args, ok: execResult.ok });

    return {
      answer: `[MOCK MODE] Based on a live database count, there are **${
        (execResult.data as { count: number })?.count ?? 0
      }** matching candidates.`,
      toolsUsed,
      geminiCallsCount: 0,
      modelUsed: "mock-llm",
    };
  }

  const args = { limit: 3 };
  const execResult = await executeCandidateTool("listRecentExtractions", args);
  toolsUsed.push({ toolName: "listRecentExtractions", args, ok: execResult.ok });

  return {
    answer: `[MOCK MODE] I checked the recent extractions in MongoDB and retrieved ${
      (execResult.data as { recent: unknown[] })?.recent?.length ?? 0
    } candidate profiles.`,
    toolsUsed,
    geminiCallsCount: 0,
    modelUsed: "mock-llm",
  };
}

export async function askAboutCandidates(
  userPrompt: string,
  priorHistory: Content[] = []
): Promise<CandidateChatResult> {
  if (process.env.USE_MOCK_LLM === "true") {
    return runMockCandidateChat(userPrompt);
  }

  const contents: Content[] = [
    ...priorHistory,
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  const toolsUsed: ToolTraceItem[] = [];
  let geminiCallsCount = 0;
  let modelUsed = "";
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    geminiCallsCount++;

    const result = await callGeminiWithFailover(contents);
    const response = result.response;
    modelUsed = result.modelUsed;

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      console.log(
        `[CandidateChat] Completed in ${geminiCallsCount} Gemini call(s) using ${modelUsed}. Tools used: ${toolsUsed.length}`
      );
      return {
        answer:
          response.text?.trim() ||
          "I checked the candidate records, but could not formulate a response.",
        toolsUsed,
        geminiCallsCount,
        modelUsed,
      };
    }

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) {
      contents.push(modelContent);
    }

    const responseParts: Part[] = [];

    for (const call of functionCalls) {
      const toolName = call.name || "unknownTool";
      const toolArgs = call.args ?? {};

      console.log(`[CandidateChat] Executing tool "${toolName}" with args:`, toolArgs);
      const execution = await executeCandidateTool(toolName, toolArgs);

      toolsUsed.push({
        toolName,
        args: toolArgs,
        ok: execution.ok,
      });

      responseParts.push({
        functionResponse: {
          name: toolName,
          id: call.id,
          response: execution.ok
            ? { result: execution.data }
            : { error: execution.error },
        },
      });
    }

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  console.warn(`[CandidateChat] Hit max tool iteration limit (${MAX_TOOL_ITERATIONS}).`);
  return {
    answer:
      "I reached the maximum number of database lookups (4 steps) for a single question. Please try asking a more specific question about your candidates.",
    toolsUsed,
    geminiCallsCount,
    modelUsed,
  };
}