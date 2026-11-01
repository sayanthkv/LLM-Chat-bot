import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ConversationSummary } from './types';
import { MarkdownRenderer } from './components/MarkdownRenderer';

export default function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/conversations');
      if (!res.ok) throw new Error('Failed to load conversation list');
      const data: ConversationSummary[] = await res.json();
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConversation = async (id: string) => {
    if (isLoading || id === activeConversationId) return;
    setActiveConversationId(id);
    setErrorMessage(null);

    try {
      const res = await fetch(`http://localhost:5000/api/conversations/${id}`);
      if (!res.ok) throw new Error('Failed to load conversation');
      const data = await res.json();

      const loadedMessages: ChatMessage[] = data.messages.map((m: any) => ({
        id: m._id || crypto.randomUUID(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));

      setMessages(loadedMessages);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load messages.');
    }
  };

  const handleNewChat = () => {
    if (isLoading) return;
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevents opening the conversation when clicking delete

    const confirmDelete = window.confirm('Delete this conversation?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete conversation.');
      }

      // Remove from sidebar state immediately
      setConversations((prev) => prev.filter((conv) => conv._id !== id));

      // If the currently open chat was deleted, reset the active screen
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMessage(err.message || 'Failed to delete conversation.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedPrompt = inputPrompt.trim();
    if (!trimmedPrompt || isLoading) return;

    setInputPrompt('');
    setErrorMessage(null);

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      try {
        const createRes = await fetch('http://localhost:5000/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmedPrompt.slice(0, 30) }),
        });
        if (!createRes.ok) throw new Error('Failed to create new conversation');
        const newConv = await createRes.json();
        currentConvId = newConv._id;
        setActiveConversationId(currentConvId);
        setConversations((prev) => [newConv, ...prev]);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error creating conversation.');
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedPrompt,
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConvId,
          prompt: trimmedPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      if (!response.body) throw new Error('Streaming not supported by browser.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunkText }
                : msg
            )
          );
        }
      }

      fetchConversations();
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err.message || 'An error occurred.');
      setMessages((prev) =>
        prev.filter((msg) => !(msg.id === assistantMessageId && msg.content === ''))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.appLayout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <button onClick={handleNewChat} style={styles.newChatBtn} disabled={isLoading}>
          + New Chat
        </button>

        <div style={styles.convList}>
          {conversations.length === 0 ? (
            <p style={styles.emptySidebar}>No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => handleSelectConversation(conv._id)}
                style={{
                  ...styles.convItemWrapper,
                  backgroundColor:
                    conv._id === activeConversationId ? '#2a2b32' : 'transparent',
                }}
              >
                <span style={styles.convTitle}>
                  💬 {conv.title || 'Untitled Chat'}
                </span>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv._id)}
                  title="Delete conversation"
                  style={styles.deleteBtn}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <div style={styles.mainContainer}>
        <header style={styles.header}>
          <h1 style={styles.title}>Gemini Chat Assistant</h1>
          <p style={styles.subtitle}>Full-stack MERN with Persistence</p>
        </header>

        <main style={styles.chatArea}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>What would you like to explore today?</h3>
              <p>Type your message below to start a new thread.</p>
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
  {msg.role === 'assistant' ? (
    msg.content ? (
      <MarkdownRenderer content={msg.content} />
    ) : (
      isLoading && '▋'
    )
  ) : (
    msg.content
  )}
</div>
                </div>
              </div>
            ))
          )}

          {errorMessage && <div style={styles.errorBanner}>⚠️ {errorMessage}</div>}

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
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appLayout: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#1e1f24',
    color: '#ececec',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#17171c',
    borderRight: '1px solid #2e3038',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px',
    gap: '12px',
  },
  newChatBtn: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #3e414c',
    backgroundColor: '#202127',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  convItemWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  convTitle: {
    fontSize: '0.88rem',
    color: '#d1d5db',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    marginRight: '8px',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8b8e98',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    lineHeight: 1,
  },
  emptySidebar: {
    color: '#6b7280',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginTop: '20px',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    padding: '14px 24px',
    borderBottom: '1px solid #2e3038',
    backgroundColor: '#18191e',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 600,
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '0.8rem',
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
  },
  roleLabel: {
    fontSize: '0.72rem',
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
    borderTop: '1px solid #2e3038',
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
  },
};