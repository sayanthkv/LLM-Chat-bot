import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ai } from './lib/gemini';

dotenv.config();

const app = express();
const port: number = parseInt(process.env.PORT || '5000', 10);
const clientUrl: string = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running smoothly' });
});

// Incoming message contract from client
interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages?: IncomingMessage[];
}

app.post(
  '/api/chat',
  async (req: Request<{}, {}, ChatRequestBody>, res: Response): Promise<void> => {
    try {
      const { messages } = req.body;

      // 1. Strict validation: Ensure messages is a non-empty array
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
          error: 'Bad Request: "messages" must be a non-empty array.',
        });
        return;
      }

      // 2. Validate individual items in the conversation
      const isValid = messages.every(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim() !== ''
      );

      if (!isValid) {
        res.status(400).json({
          error: 'Bad Request: Every message must have a valid role and non-empty content.',
        });
        return;
      }

      // 3. Map application roles to Gemini SDK format
      // In Gemini: 'user' stays 'user', 'assistant' maps to 'model'
      const formattedContents = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content.trim() }],
      }));

      // 4. Generate content with full multi-turn context
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction:
            'You are a helpful, knowledgeable AI assistant. Keep responses clear, helpful, and concise.',
        },
      });

      const replyText = response.text;

      if (!replyText) {
        res.status(502).json({
          error: 'Bad Gateway: Empty response returned from LLM provider.',
        });
        return;
      }

      res.status(200).json({ reply: replyText.trim() });
    } catch (error: any) {
      console.error('Error generating AI content:', error?.message || error);
      res.status(500).json({
        error: error?.message || 'Internal Server Error: Failed to generate response.',
      });
    }
  }
);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});