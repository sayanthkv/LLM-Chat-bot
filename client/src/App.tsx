import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, HistoryMessagePayload } from './types';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedPrompt = inputPrompt.trim();
    if (!trimmedPrompt || isLoading) return;

    setInputPrompt('');
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedPrompt,
      createdAt: new Date(),
    };

    const historyPayload: HistoryMessagePayload[] = [
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: userMessage.role,
        content: userMessage.content,
      },
    ];

    // Placeholder message for streaming tokens
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    // Optimistically update both user message and empty assistant bubble
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser or response has no body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          
          // Incrementally append chunk to the target assistant message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunkText }
                : msg
            )
          );
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Chat error:', err);
      setErrorMessage(message);

      // Clean up empty placeholder if failed before stream started
      setMessages((prev) =>
        prev.filter((msg) => !(msg.id === assistantMessageId && msg.content === ''))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Gemini Chat Assistant</h1>
        <p style={styles.subtitle}>Streaming & Multi-turn Enabled</p>
      </header>

      <main style={styles.chatArea}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <h3>Ready when you are</h3>
            <p>Ask a complex question to see real-time streaming in action!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: msg.role === 'user' ? '#10a37f' : '#2a2b32',
                  color: '#ffffff',
                }}
              >
                <div style={styles.roleLabel}>
                  {msg.role === 'user' ? 'You' : 'Gemini'}
                </div>
                <div style={styles.messageContent}>
                  {msg.content || (isLoading && msg.role === 'assistant' ? '▋' : '')}
                </div>
              </div>
            </div>
          ))
        )}

        {errorMessage && (
          <div style={styles.errorBanner}>
            ⚠️ {errorMessage}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Type your message here..."
          disabled={isLoading}
          style={styles.input}
        />
        <button
          type="submit"
          disabled={isLoading || !inputPrompt.trim()}
          style={{
            ...styles.button,
            opacity: isLoading || !inputPrompt.trim() ? 0.6 : 1,
            cursor: isLoading || !inputPrompt.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#1e1f24',
    color: '#ececec',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #32353f',
    backgroundColor: '#18191e',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '0.85rem',
    color: '#8e9297',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '850px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  emptyState: {
    textAlign: 'center',
    margin: 'auto',
    color: '#6e737d',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  bubble: {
    maxWidth: '75%',
    padding: '12px 18px',
    borderRadius: '12px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  roleLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.8,
  },
  messageContent: {
    fontSize: '0.95rem',
    whiteSpace: 'pre-wrap',
  },
  errorBanner: {
    padding: '10px 16px',
    backgroundColor: '#ff4d4f22',
    border: '1px solid #ff4d4f',
    borderRadius: '8px',
    color: '#ff7875',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #32353f',
    backgroundColor: '#18191e',
    maxWidth: '850px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #434651',
    backgroundColor: '#2a2b32',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#10a37f',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.95rem',
    transition: 'opacity 0.2s ease',
  },
};