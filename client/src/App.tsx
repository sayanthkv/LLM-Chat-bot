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
  FileCheck2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      const res = await fetch(`${API_BASE}/api/conversations`);
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
      const res = await fetch(`${API_BASE}/api/conversations/${id}`);
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
      const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
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
        const createRes = await fetch(`${API_BASE}/api/conversations`, {
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
      const response = await fetch(`${API_BASE}/api/chat`, {
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

  const activeTitle = conversations.find((c) => c._id === activeConversationId)?.title || 'New Session';

  return (
    <div style={styles.appLayout}>
      {/* Collapsible Left Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          width: isSidebarOpen ? '280px' : '0px',
          padding: isSidebarOpen ? '18px 14px' : '0px',
          borderRightWidth: isSidebarOpen ? '1px' : '0px',
        }}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.brandContainer}>
            <div style={styles.brandIcon}>
              <Sparkles size={17} color="#ffffff" />
            </div>
            <div>
              <div style={styles.brandTitle}>CoreAI Studio</div>
              <div style={styles.brandSubtitle}>LLM Operations</div>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            title="Collapse Sidebar"
            style={styles.iconBtn}
          >
            <PanelLeftClose size={17} color="#475569" />
          </button>
        </div>

        {/* View Mode Toggle Pill */}
        <div style={styles.tabSwitcher}>
          <button
            onClick={() => setViewMode('chat')}
            style={{
              ...styles.tabBtn,
              backgroundColor: viewMode === 'chat' ? '#ffffff' : 'transparent',
              color: viewMode === 'chat' ? '#14532d' : '#64748b',
              boxShadow: viewMode === 'chat' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              fontWeight: viewMode === 'chat' ? 600 : 500,
            }}
          >
            <MessageSquare size={14} color={viewMode === 'chat' ? '#166534' : '#64748b'} />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setViewMode('extractor')}
            style={{
              ...styles.tabBtn,
              backgroundColor: viewMode === 'extractor' ? '#ffffff' : 'transparent',
              color: viewMode === 'extractor' ? '#14532d' : '#64748b',
              boxShadow: viewMode === 'extractor' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              fontWeight: viewMode === 'extractor' ? 600 : 500,
            }}
          >
            <FileCheck2 size={14} color={viewMode === 'extractor' ? '#166534' : '#64748b'} />
            <span>Extractor</span>
          </button>
        </div>

        {viewMode === 'chat' ? (
          <>
            <button onClick={handleNewChat} style={styles.newChatBtn} disabled={isLoading}>
              <Plus size={15} color="#ffffff" />
              <span>New Conversation</span>
            </button>

            <div style={styles.sessionHeaderRow}>
              <span>HISTORY</span>
              <span>{conversations.length}</span>
            </div>

            <div style={styles.convList}>
              {conversations.length === 0 ? (
                <div style={styles.emptySidebar}>No prior sessions found</div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv._id === activeConversationId;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv._id)}
                      style={{
                        ...styles.convItem,
                        backgroundColor: isActive ? '#f0fdf4' : 'transparent',
                        borderColor: isActive ? '#bbf7d0' : 'transparent',
                      }}
                    >
                      <MessageSquare 
                        size={14} 
                        color={isActive ? '#15803d' : '#94a3b8'} 
                        style={{ flexShrink: 0 }} 
                      />
                      <span
                        style={{
                          ...styles.convTitle,
                          color: isActive ? '#14532d' : '#334155',
                          fontWeight: isActive ? 600 : 450,
                        }}
                      >
                        {conv.title || 'Untitled Session'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv._id)}
                        title="Delete session"
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div style={styles.extractorInfoBox}>
            <div style={styles.infoBoxHeader}>
              <ShieldCheck size={16} color="#15803d" />
              <strong style={{ fontSize: '0.82rem', color: '#166534' }}>Structured Parser</strong>
            </div>
            <p style={styles.extractorInfoText}>
              Submits unstructured candidate summaries into a strict Zod contract with automatic self-healing repair loops.
            </p>
          </div>
        )}
      </aside>

      {/* Main Panel */}
      <div style={styles.mainContainer}>
        {viewMode === 'extractor' ? (
          <ResumeExtractor />
        ) : (
          <>
            {/* Clean Top Bar */}
            <header style={styles.navbar}>
              <div style={styles.navLeft}>
                {!isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    title="Open Sidebar"
                    style={styles.sidebarToggleBtn}
                  >
                    <PanelLeft size={16} color="#475569" />
                  </button>
                )}
                <div style={styles.breadcrumbs}>
                  <span style={styles.breadcrumbMuted}>Sessions</span>
                  <ChevronRight size={13} color="#94a3b8" />
                  <span style={styles.navTitle}>{activeTitle}</span>
                </div>
              </div>

              <div style={styles.modelPill}>
                <span style={styles.statusDot}></span>
                <span>gemini-2.5-flash</span>
              </div>
            </header>

            {/* Conversation Flow */}
            <main style={styles.chatArea}>
              {messages.length === 0 ? (
                <div style={styles.emptyStateContainer}>
                  <div style={styles.emptyIconCircle}>
                    <Sparkles size={24} color="#15803d" />
                  </div>
                  <h2 style={styles.emptyHeading}>How can I help you today?</h2>
                  <p style={styles.emptySubtext}>
                    Ask complex systems questions, plan architecture, or refine full-stack workflows.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageRow,
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageContainer,
                          flexDirection: isUser ? 'row-reverse' : 'row',
                        }}
                      >
                        <div
                          style={{
                            ...styles.avatar,
                            backgroundColor: isUser ? '#14532d' : '#ffffff',
                            borderColor: isUser ? '#14532d' : '#e2e8f0',
                            color: isUser ? '#ffffff' : '#15803d',
                          }}
                        >
                          {isUser ? <User size={14} color="#ffffff" /> : <Bot size={14} color="#15803d" />}
                        </div>

                        <div
                          style={{
                            ...styles.bubble,
                            backgroundColor: isUser ? '#14532d' : '#ffffff',
                            color: isUser ? '#f8fafc' : '#1e293b',
                            borderColor: isUser ? '#14532d' : '#e2e8f0',
                            boxShadow: isUser 
                              ? '0 2px 6px rgba(20, 83, 45, 0.15)' 
                              : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                          }}
                        >
                          {!isUser ? (
                            msg.content ? (
                              <div style={styles.assistantMarkdown}>
                                <MarkdownRenderer content={msg.content} />
                                {isLoading && msg.id === messages[messages.length - 1]?.id && (
                                  <span className="streaming-cursor"></span>
                                )}
                              </div>
                            ) : (
                              <span className="streaming-cursor"></span>
                            )
                          ) : (
                            <div style={styles.userMessageText}>{msg.content}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {errorMessage && (
                <div style={styles.errorBanner}>
                  <AlertCircle size={15} color="#b91c1c" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </main>

            {/* Input Form Bar */}
            <div style={styles.composerWrapper}>
              <div style={styles.inputBox}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or describe a task..."
                  disabled={isLoading}
                  style={styles.textarea}
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputPrompt.trim()}
                  style={{
                    ...styles.sendBtn,
                    backgroundColor: !inputPrompt.trim() || isLoading ? '#e2e8f0' : '#14532d',
                    cursor: !inputPrompt.trim() || isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send 
                    size={15} 
                    color={!inputPrompt.trim() || isLoading ? '#94a3b8' : '#ffffff'} 
                  />
                </button>
              </div>
              <div style={styles.footerNote}>
                Tokens stream in real time via Gemini 2.5 Flash • Press Enter to send, Shift + Enter for newline
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
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s',
    overflow: 'hidden',
    boxSizing: 'border-box',
    zIndex: 10,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    padding: '0 2px',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
  },
  brandIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    backgroundColor: '#14532d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(20, 83, 45, 0.2)',
  },
  brandTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  brandSubtitle: {
    fontSize: '0.70rem',
    color: '#64748b',
    fontWeight: 500,
  },
  tabSwitcher: {
    display: 'flex',
    gap: '4px',
    padding: '3px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    marginBottom: '14px',
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#14532d',
    color: '#ffffff',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(20, 83, 45, 0.15)',
    transition: 'background-color 0.15s ease',
  },
  sessionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: '#94a3b8',
    padding: '0 4px 6px 4px',
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
    gap: '8px',
    padding: '7px 9px',
    borderRadius: '7px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.12s ease',
  },
  convTitle: {
    flex: 1,
    fontSize: '0.82rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.12s ease',
  },
  emptySidebar: {
    color: '#94a3b8',
    fontSize: '0.78rem',
    textAlign: 'center',
    marginTop: '32px',
  },
  extractorInfoBox: {
    padding: '12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
  },
  infoBoxHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  extractorInfoText: {
    fontSize: '0.76rem',
    color: '#166534',
    lineHeight: 1.45,
    margin: 0,
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  navbar: {
    height: '52px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sidebarToggleBtn: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  breadcrumbMuted: {
    fontSize: '0.80rem',
    color: '#64748b',
    fontWeight: 500,
  },
  navTitle: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#0f172a',
    maxWidth: '350px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  modelPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '0.74rem',
    fontWeight: 600,
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#16a34a',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '6px',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    maxWidth: '820px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  emptyStateContainer: {
    margin: 'auto',
    textAlign: 'center',
    maxWidth: '440px',
    padding: '40px 16px',
  },
  emptyIconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px auto',
  },
  emptyHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  emptySubtext: {
    fontSize: '0.85rem',
    color: '#64748b',
    lineHeight: 1.5,
    margin: 0,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageContainer: {
    display: 'flex',
    gap: '10px',
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
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  bubble: {
    padding: '11px 15px',
    borderRadius: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  userMessageText: {
    fontSize: '0.90rem',
    color: '#ffffff',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
  },
  assistantMarkdown: {
    fontSize: '0.90rem',
    color: '#1e293b',
    lineHeight: 1.6,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '0.82rem',
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
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '8px 10px 8px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#0f172a',
    fontSize: '0.90rem',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.45,
    maxHeight: '180px',
  },
  sendBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '7px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '0.70rem',
    color: '#94a3b8',
    marginTop: '6px',
  },
};