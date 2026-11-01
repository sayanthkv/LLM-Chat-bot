// client/src/App.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ConversationSummary } from './types';
import { ResumeExtractor } from './components/ResumeExtractor';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  Plus, 
  Send, 
  PanelLeftClose, 
  PanelLeft, 
  AlertCircle,
  Bot,
  User,
  FileCheck2
} from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'chat' | 'extractor'>('chat');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, viewMode]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

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
    setViewMode('chat');
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
    setViewMode('chat');
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    try {
      const res = await fetch(`http://localhost:5000/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete conversation.');
      }

      setConversations((prev) => prev.filter((conv) => conv._id !== id));

      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMessage(err.message || 'Failed to delete conversation.');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedPrompt = inputPrompt.trim();
    if (!trimmedPrompt || isLoading) return;

    setInputPrompt('');
    setErrorMessage(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={styles.appLayout}>
      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          width: isSidebarOpen ? '270px' : '0px',
          padding: isSidebarOpen ? '16px 12px' : '0px',
          opacity: isSidebarOpen ? 1 : 0,
        }}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.brandTitle}>
            <Sparkles size={18} color="#10b981" />
            <span>AI Workspace</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            title="Close sidebar"
            style={styles.iconBtn}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div style={styles.tabSwitcher}>
          <button
            onClick={() => setViewMode('chat')}
            style={{
              ...styles.tabBtn,
              backgroundColor: viewMode === 'chat' ? '#102a20' : '#14171d',
              borderColor: viewMode === 'chat' ? '#10b981' : '#232833',
              color: viewMode === 'chat' ? '#34d399' : '#9ca3af',
            }}
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setViewMode('extractor')}
            style={{
              ...styles.tabBtn,
              backgroundColor: viewMode === 'extractor' ? '#102a20' : '#14171d',
              borderColor: viewMode === 'extractor' ? '#10b981' : '#232833',
              color: viewMode === 'extractor' ? '#34d399' : '#9ca3af',
            }}
          >
            <FileCheck2 size={14} />
            <span>Extractor</span>
          </button>
        </div>

        {viewMode === 'chat' ? (
          <>
            <button onClick={handleNewChat} style={styles.newChatBtn} disabled={isLoading}>
              <Plus size={16} />
              <span>New Chat</span>
            </button>

            <div style={styles.convList}>
              {conversations.length === 0 ? (
                <div style={styles.emptySidebar}>No conversations yet</div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv._id === activeConversationId;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv._id)}
                      style={{
                        ...styles.convItem,
                        backgroundColor: isActive ? '#1e232d' : 'transparent',
                        borderColor: isActive ? '#2d3748' : 'transparent',
                      }}
                    >
                      <MessageSquare size={15} color={isActive ? '#10b981' : '#6b7280'} />
                      <span style={{ ...styles.convTitle, color: isActive ? '#f3f4f6' : '#9ca3af' }}>
                        {conv.title || 'Untitled Session'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv._id)}
                        title="Delete conversation"
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div style={styles.extractorInfoBox}>
            <p style={styles.extractorInfoText}>
              Paste messy resume text to extract candidate contact info, skills, experience, and education validated with Zod.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Panel */}
      <div style={styles.mainContainer}>
        {viewMode === 'extractor' ? (
          <ResumeExtractor />
        ) : (
          <>
            {/* Top Navbar */}
            <header style={styles.navbar}>
              <div style={styles.navLeft}>
                {!isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    title="Open sidebar"
                    style={styles.iconBtn}
                  >
                    <PanelLeft size={18} />
                  </button>
                )}
                <span style={styles.navTitle}>
                  {conversations.find((c) => c._id === activeConversationId)?.title || 'New Conversation'}
                </span>
              </div>
              <div style={styles.modelBadge}>
                <span style={styles.statusDot}></span>
                gemini-3.5-flash
              </div>
            </header>

            {/* Message Area */}
            <main style={styles.chatArea}>
              {messages.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIconBox}>
                    <Sparkles size={28} color="#10b981" />
                  </div>
                  <h2 style={styles.emptyHeading}>Where would you like to start?</h2>
                  <p style={styles.emptySubtext}>
                    Ask code questions, draft architecture ideas, or debug complex issues.
                  </p>
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
                        ...styles.messageContainer,
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <div
                        style={{
                          ...styles.avatar,
                          backgroundColor: msg.role === 'user' ? '#047857' : '#1e2430',
                          border: msg.role === 'user' ? 'none' : '1px solid #28303f',
                        }}
                      >
                        {msg.role === 'user' ? <User size={15} color="#fff" /> : <Bot size={15} color="#10b981" />}
                      </div>

                      <div
                        style={{
                          ...styles.bubble,
                          backgroundColor: msg.role === 'user' ? '#064e3b' : '#14171d',
                          borderColor: msg.role === 'user' ? '#065f46' : '#1f242d',
                        }}
                      >
                        {msg.role === 'assistant' ? (
                          msg.content ? (
                            <>
                              <MarkdownRenderer content={msg.content} />
                              {isLoading && msg.id === messages[messages.length - 1]?.id && (
                                <span className="streaming-cursor"></span>
                              )}
                            </>
                          ) : (
                            <span className="streaming-cursor"></span>
                          )
                        ) : (
                          <div style={styles.userMessageText}>{msg.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {errorMessage && (
                <div style={styles.errorBanner}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </main>

            {/* Floating Input Composer */}
            <div style={styles.composerWrapper}>
              <div style={styles.inputBox}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything... (Press Enter to send, Shift + Enter for new line)"
                  disabled={isLoading}
                  style={styles.textarea}
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputPrompt.trim()}
                  style={{
                    ...styles.sendBtn,
                    backgroundColor: !inputPrompt.trim() || isLoading ? '#1c222c' : '#10b981',
                    cursor: !inputPrompt.trim() || isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={16} color={!inputPrompt.trim() || isLoading ? '#6b7280' : '#ffffff'} />
                </button>
              </div>
              <div style={styles.footerNote}>
                Powered by Google Gemini 3.5 Flash • Press Enter to send
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appLayout: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0a0c0f',
    overflow: 'hidden',
  },
  sidebar: {
    backgroundColor: '#0f1115',
    borderRight: '1px solid #1a1e26',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), padding 0.22s, opacity 0.15s',
    overflow: 'hidden',
    boxSizing: 'border-box',
    zIndex: 10,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    padding: '0 4px',
  },
  brandTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 700,
    fontSize: '0.92rem',
    color: '#f9fafb',
    letterSpacing: '-0.2px',
  },
  tabSwitcher: {
    display: 'flex',
    gap: '6px',
    marginBottom: '14px',
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '7px 8px',
    borderRadius: '7px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  extractorInfoBox: {
    padding: '12px',
    backgroundColor: '#13161c',
    borderRadius: '8px',
    border: '1px solid #1f2530',
  },
  extractorInfoText: {
    fontSize: '0.78rem',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #232833',
    backgroundColor: '#161920',
    color: '#e5e7eb',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '14px',
    transition: 'all 0.15s ease',
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '7px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s ease',
  },
  convTitle: {
    flex: 1,
    fontSize: '0.86rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySidebar: {
    color: '#6b7280',
    fontSize: '0.82rem',
    textAlign: 'center',
    marginTop: '28px',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0a0c0f',
    overflow: 'hidden',
  },
  navbar: {
    height: '52px',
    borderBottom: '1px solid #181c24',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    backgroundColor: '#0d1015',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#e5e7eb',
    maxWidth: '400px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  modelBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '4px 10px',
    borderRadius: '9999px',
    backgroundColor: '#141820',
    border: '1px solid #232a38',
    color: '#9ca3af',
    fontSize: '0.78rem',
    fontFamily: '"JetBrains Mono", monospace',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '820px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  emptyState: {
    margin: 'auto',
    textAlign: 'center',
    maxWidth: '420px',
  },
  emptyIconBox: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    backgroundColor: '#131920',
    border: '1px solid #232c3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  emptyHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f3f4f6',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '0.88rem',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageContainer: {
    display: 'flex',
    gap: '12px',
    maxWidth: '85%',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  bubble: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  userMessageText: {
    fontSize: '0.94rem',
    color: '#f9fafb',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#3b1212',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '0.88rem',
  },
  composerWrapper: {
    maxWidth: '820px',
    width: '100%',
    margin: '0 auto',
    padding: '0 20px 16px 20px',
    boxSizing: 'border-box',
  },
  inputBox: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    backgroundColor: '#13161c',
    border: '1px solid #232833',
    borderRadius: '12px',
    padding: '10px 12px 10px 16px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f3f4f6',
    fontSize: '0.94rem',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.45,
    maxHeight: '180px',
  },
  sendBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
    flexShrink: 0,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '0.74rem',
    color: '#6b7280',
    marginTop: '8px',
  },
};