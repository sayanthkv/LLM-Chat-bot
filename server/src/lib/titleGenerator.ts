import { ai } from './gemini';

/**
 * Generates a clean 3-5 word title based on the first user message.
 */
export async function generateConversationTitle(firstPrompt: string): Promise<string> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Generate a concise, catchy 3 to 5 word title summarizing this user question or prompt. 
Do NOT use quotes, punctuation, markdown formatting, or prefix words like "Title:". 

User Prompt: "${firstPrompt}"`,
    });

    const candidate = res.text?.trim().replace(/["']/g, '');
    if (candidate && candidate.length > 0) {
      // Fallback slice in case the model returns a long phrase
      return candidate.slice(0, 45);
    }
  } catch (error) {
    console.error('Failed to auto-generate title with Gemini:', error);
  }

  // Graceful fallback: first 30 chars of prompt if AI title fails
  return firstPrompt.trim().slice(0, 30);
}