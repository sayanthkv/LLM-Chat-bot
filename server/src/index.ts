import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { ai } from './lib/gemini';
import { connectDB } from './lib/db';
import { Conversation } from './models/Conversation';
import { generateConversationTitle } from './lib/titleGenerator';
import extractRoutes from './routes/extractRoutes';

dotenv.config();

const app = express();
const port: number = parseInt(process.env.PORT || '5000', 10);
const clientUrl: string = process.env.CLIENT_URL || 'http://localhost:5173';

// Enable trust proxy for reverse proxies (Render, Vercel)
app.set('trust proxy', 1);

// Helper for stepped backoff delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Rate Limiting Configurations
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI usage quota reached. Please wait a minute before making more requests.',
  },
});

// 2. Middleware configuration
app.use(
  cors({
    origin: clientUrl,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Apply global rate limiting to all /api routes
app.use('/api', globalLimiter);

// Protected extraction routes with AI limiter
app.use('/api', aiLimiter, extractRoutes);

// Health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running smoothly' });
});

// 3. List all conversations (for sidebar)
app.get('/api/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const list = await Conversation.find({}, '_id title updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json(list);
  } catch (error: any) {
    console.error('Fetch conversations error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to fetch conversations.' });
  }
});

// 4. Create a new conversation session
app.post('/api/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const conversation = await Conversation.create({
      title: title || 'New Conversation',
      messages: [],
    });
    res.status(201).json(conversation);
  } catch (error: any) {
    console.error('Create conversation error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to create conversation.' });
  }
});

// 5. Get a specific conversation with all messages
app.get('/api/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    res.status(200).json(conversation);
  } catch (error: any) {
    console.error('Fetch conversation error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to fetch conversation.' });
  }
});

// 6. Delete a conversation and its messages
app.delete('/api/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedConversation = await Conversation.findByIdAndDelete(id);

    if (!deletedConversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (error: any) {
    console.error('Delete conversation error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to delete conversation.' });
  }
});

// 7. Streaming chat route with multi-turn memory & Turn-1 AI title generation
interface ChatRequestBody {
  conversationId: string;
  prompt: string;
}

app.post(
  '/api/chat',
  aiLimiter,
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

      // Fetch conversation from MongoDB
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }

      // Check Turn 1 BEFORE pushing user prompt
      const isFirstTurn = conversation.messages.length === 0;

      // Append incoming user prompt
      const userMessage = {
        role: 'user' as const,
        content: prompt.trim(),
        createdAt: new Date(),
      };
      conversation.messages.push(userMessage);

      // Map messages into Gemini's multi-turn format
      const formattedContents = conversation.messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Configure HTTP chunked streaming headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      // Request stream from gemini-3.5-flash with exponential backoff retry for 503 spikes
      let responseStream;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          responseStream = await ai.models.generateContentStream({
            model: 'gemini-3.5-flash',
            contents: formattedContents,
            config: {
              systemInstruction:
                'You are a helpful, knowledgeable AI assistant. Keep responses clear, helpful, and concise.',
            },
          });
          break;
        } catch (streamErr: any) {
          const errStr = streamErr?.message || String(streamErr);
          const isTransient =
            errStr.includes('503') ||
            errStr.includes('UNAVAILABLE') ||
            errStr.includes('high demand');

          attempts++;
          if (isTransient && attempts < maxAttempts) {
            console.warn(`[Gemini 503 Spike] Retrying in ${attempts * 2}s (Attempt ${attempts}/${maxAttempts})...`);
            await sleep(attempts * 2000);
          } else {
            throw streamErr;
          }
        }
      }

      if (!responseStream) {
        throw new Error('Could not establish stream with Gemini.');
      }

      let completeReply = '';

      // Stream tokens to client as they arrive
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          completeReply += text;
          res.write(text);
        }
      }

      // Save full model reply into conversation history
      conversation.messages.push({
        role: 'assistant',
        content: completeReply.trim(),
        createdAt: new Date(),
      });

      // Auto-generate clean title if this was Turn 1
      if (isFirstTurn) {
        try {
          const smartTitle = await generateConversationTitle(prompt.trim());
          console.log(`[AutoTitler] Generated: "${smartTitle}"`);
          conversation.title = smartTitle;
        } catch (titleErr) {
          console.warn('[AutoTitler] Title generation failed, using fallback:', titleErr);
          conversation.title = prompt.trim().slice(0, 30);
        }
      }

      await conversation.save();
      res.end();
    } catch (error: any) {
      console.error('Chat streaming error:', error?.message || error);

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

// Connect to MongoDB, then boot Express
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});