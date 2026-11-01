# Full-Stack AI Platform: Streaming Chat Console & Smart Resume Extractor

A production-ready full-stack AI platform combining low-latency real-time token streaming with structured data extraction. Built to overcome common LLM engineering pitfalls: JSON hallucinations, quota exhaustion, streaming connection drops, and socket timeouts.

---

## 🔗 Live Deployment
- **Frontend App:** [https://your-app-name.vercel.app](https://your-app-name.vercel.app)
- **Backend Service:** [https://your-api-name.onrender.com](https://your-api-name.onrender.com)

---

## 📸 Demo Preview

<!-- Replace the placeholder paths with your actual asset links or repo files -->
| Real-Time Streaming Chat | Smart Resume Extractor |
| :---: | :---: |
| ![Chat Demo](./docs/chat-preview.gif) | ![Extractor Demo](./docs/extractor-preview.png) |

---

## ⚡ Key Features

### 1. Real-Time Token Streaming Chat
- **Sub-400ms Time-To-First-Token (TTFT):** Uses Node.js HTTP `Transfer-Encoding: chunked` combined with native client-side `ReadableStream` decoding.
- **Stateful Conversational Memory:** Maps dialogue history to Gemini's multi-turn schema (`user` and `model` parts) and persists sessions using MongoDB embedded documents.
- **Asynchronous Auto-Titling:** Evaluates turn-1 user prompts in the background to automatically assign a 3–5 word descriptive title without blocking the main stream.
- **Markdown & Code Rendering:** Syntax highlighting, code block formatting, and inline copy buttons via `react-markdown` and `remark-gfm`.

### 2. Smart Resume Extractor (Structured Output)
- **Schema Enforcement with Zod:** Converts unstructured, noisy resume text into structured candidate records validated against a strict schema.
- **Self-Healing LLM Retry Loop:** If model output fails schema validation, a 2-turn correction loop feeds Zod error reports back to Gemini for self-correction.
- **Few-Shot Prompt Engineering:** Seeds conversation context with realistic input/output pairs to improve classification of experience levels (`ENTRY`, `MID`, `SENIOR`, `LEAD`) and date ranges.
- **Durable Persistence:** Validated candidate profiles are saved directly to MongoDB and displayed in an extraction dashboard.

### 3. Production Resilience & Security
- **Strict Rate Limiting:** Enforces IP-based rate limiting via `express-rate-limit` (5 AI requests/min) to prevent quota depletion.
- **503 Transient Surge Backoff:** Automatically handles Google Gemini traffic spikes using exponential backoff (2s, 4s stepped retries).
- **Windows IPv4 Priority:** Resolved residential ISP socket hangs using `--dns-result-order=ipv4first`.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Lucide Icons, React-Markdown, Remark-GFM |
| **Backend** | Node.js, Express, TypeScript, Zod, `express-rate-limit`, `tsx` |
| **AI Inference** | Google Gemini API (`@google/genai` SDK, `gemini-2.5-flash`, `gemini-3.5-flash`) |
| **Database** | MongoDB Atlas, Mongoose (Embedded Subdocuments) |
| **Deployment** | Vercel (Client), Render (API Web Service) |

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB daemon)
- Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/llm-chat-app.git](https://github.com/your-username/llm-chat-app.git)
cd llm-chat-app
2. Backend Setup (server)
Navigate to the server folder and install dependencies:

Bash
cd server
npm install
Create a .env file in the server directory:

Code snippet
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
Start the backend development server:

Bash
npm run dev
The server runs at http://localhost:5000 with hot-reloading enabled.

3. Frontend Setup (client)
Open a new terminal tab, navigate to the client folder, and install dependencies:

Bash
cd client
npm install
Create a .env file in the client directory:

Code snippet
VITE_API_URL=http://localhost:5000
Launch the client:

Bash
npm run dev
The frontend will run at http://localhost:5173.

🧪 Testing the Extraction Suite
To run the automated test suite testing normal parsing, missing data, prompt injection defenses, and non-English resumes:

Bash
cd server
npx tsx src/test-step10.ts
🛡️ License
Distributed under the MIT License. See LICENSE for details.