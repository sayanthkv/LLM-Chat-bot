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

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
          error: 'Bad Request: "messages" must be a non-empty array.',
        });
        return;
      }

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

      const formattedContents = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content.trim() }],
      }));

      // Set streaming headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      // Request stream from Gemini 3.5 Flash
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction:
            'You are a helpful, knowledgeable AI assistant. Keep responses clear, helpful, and concise.',
        },
      });

      // Stream each generated token chunk to the client
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(text);
        }
      }

      // Finalize the HTTP stream
      res.end();
    } catch (error: any) {
      console.error('Streaming error:', error?.message || error);

      // If headers haven't sent, we can still send a structured 500 JSON
      if (!res.headersSent) {
        res.status(500).json({
          error: error?.message || 'Internal Server Error: Failed to generate response.',
        });
      } else {
        // If the stream already started, terminate cleanly
        res.end();
      }
    }
  }
);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});