import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ai } from './lib/gemini';
import { connectDB } from './lib/db';
import { Conversation } from './models/Conversation';

dotenv.config();

const app = express();
const port: number = parseInt(process.env.PORT || '5000', 10);
const clientUrl: string = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: clientUrl,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running smoothly' });
});

// 2. List all conversations (for sidebar)
app.get('/api/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const list = await Conversation.find({}, '_id title updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch conversations.' });
  }
});

// 3. Create a new conversation
app.post('/api/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const conversation = await Conversation.create({
      title: title || 'New Conversation',
      messages: [],
    });
    res.status(201).json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create conversation.' });
  }
});

// 4. Get a specific conversation and all its messages
app.get('/api/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.status(200).json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch conversation.' });
  }
});

// 5. Streaming chat route with MongoDB persistence
interface ChatRequestBody {
  conversationId: string;
  prompt: string;
}

app.post(
  '/api/chat',
  async (req: Request<{}, {}, ChatRequestBody>, res: Response): Promise<void> => {
    try {
      const { conversationId, prompt } = req.body;

      if (!conversationId || typeof conversationId !== 'string') {
        res.status(400).json({ error: 'Bad Request: "conversationId" is required.' });
        return;
      }

      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        res.status(400).json({ error: 'Bad Request: "prompt" must be a non-empty string.' });
        return;
      }

      // 1. Fetch existing conversation from DB
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }

      // 2. Set title automatically from the first message if still default
      if (conversation.messages.length === 0 && conversation.title === 'New Conversation') {
        conversation.title = prompt.trim().slice(0, 40);
      }

      // 3. Append user message to conversation
      const userMessage = {
        role: 'user' as const,
        content: prompt.trim(),
        createdAt: new Date(),
      };
      conversation.messages.push(userMessage);

      // 4. Map DB history into Gemini-compatible contents format
      const formattedContents = conversation.messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // 5. Set up chunked streaming headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      // 6. Request streaming response from Gemini 3.5 Flash
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction:
            'You are a helpful, knowledgeable AI assistant. Keep responses clear, helpful, and concise.',
        },
      });

      let completeReply = '';

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          completeReply += text;
          res.write(text);
        }
      }

      // 7. Persist assistant reply in MongoDB
      conversation.messages.push({
        role: 'assistant',
        content: completeReply.trim(),
        createdAt: new Date(),
      });
      await conversation.save();

      res.end();
    } catch (error: any) {
      console.error('Chat persistence error:', error?.message || error);

      if (!res.headersSent) {
        res.status(500).json({
          error: error?.message || 'Internal Server Error: Failed to process chat.',
        });
      } else {
        res.end();
      }
    }
  }
);

// Connect to MongoDB before starting server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});