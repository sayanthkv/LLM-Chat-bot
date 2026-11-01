import { ai } from './gemini';

export async function generateConversationTitle(firstPrompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a short, concise 2 to 4 word title that summarizes this conversation starter. Output ONLY the plain title text without quotation marks, colons, or punctuation:\n\n"${firstPrompt}"`,
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
    if (!candidate) {
      return firstPrompt.slice(0, 25);
    }

    // Strip out quotes, markdown, and trailing punctuation
    const cleanedTitle = candidate
      .replace(/^["'`#*\s]+|["'`#*\s]+$/g, '')
      .replace(/[.:;!]+$/, '')
      .trim();

    return cleanedTitle || firstPrompt.slice(0, 25);
  } catch (error) {
    console.error('[AutoTitler] Generation fallback due to error:', error);
    return firstPrompt.slice(0, 25);
  }
}