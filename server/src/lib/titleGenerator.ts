import { ai } from './gemini';

// Prioritize fast, high-throughput models for short summary titling
const TITLE_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

export async function generateConversationTitle(firstPrompt: string): Promise<string> {
  for (const model of TITLE_FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate a short, concise 2 to 4 word title that summarizes this conversation starter. Output ONLY the plain title text without quotes, colons, or punctuation:\n\n"${firstPrompt}"`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.2,
          maxOutputTokens: 20,
        },
      });

      const candidate = response?.text?.trim();
      if (candidate) {
        const cleaned = candidate
          .replace(/^["'`#*\s]+|["'`#*\s]+$/g, '')
          .replace(/[.:;!]+$/, '')
          .trim();
        return cleaned || firstPrompt.slice(0, 25);
      }
    } catch (err: any) {
      console.warn(`[AutoTitler] ${model} quota reached or busy, falling back...`);
    }
  }

  return firstPrompt.slice(0, 25);
}