import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div style={styles.wrapper}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={language} code={codeString} />;
            }

            return (
              <code style={styles.inlineCode} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p style={styles.paragraph}>{children}</p>;
          },
          ul({ children }) {
            return <ul style={styles.list}>{children}</ul>;
          },
          ol({ children }) {
            return <ol style={styles.orderedList}>{children}</ol>;
          },
          li({ children }) {
            return <li style={styles.listItem}>{children}</li>;
          },
          table({ children }) {
            return (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th style={styles.th}>{children}</th>;
          },
          td({ children }) {
            return <td style={styles.td}>{children}</td>;
          },
          blockquote({ children }) {
            return <blockquote style={styles.blockquote}>{children}</blockquote>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div style={styles.codeContainer}>
      <div style={styles.codeHeader}>
        <span style={styles.codeLang}>{language || 'code'}</span>
        <button onClick={handleCopy} style={styles.copyBtn}>
          {copied ? (
            <>
              <Check size={13} color="#10b981" />
              <span style={{ color: '#10b981' }}>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre style={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    lineHeight: 1.65,
    fontSize: '0.94rem',
    color: '#e5e7eb',
  },
  paragraph: {
    margin: '0 0 12px 0',
  },
  list: {
    margin: '0 0 12px 20px',
    padding: 0,
  },
  orderedList: {
    margin: '0 0 12px 20px',
    padding: 0,
  },
  listItem: {
    marginBottom: '6px',
  },
  inlineCode: {
    backgroundColor: '#1b1e25',
    color: '#34d399',
    padding: '3px 6px',
    borderRadius: '4px',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: '0.85em',
    border: '1px solid #282d38',
  },
  codeContainer: {
    backgroundColor: '#0c0d10',
    borderRadius: '8px',
    margin: '14px 0',
    overflow: 'hidden',
    border: '1px solid #1f242d',
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#14171d',
    padding: '8px 14px',
    borderBottom: '1px solid #1f242d',
  },
  codeLang: {
    fontSize: '0.74rem',
    color: '#9ca3af',
    textTransform: 'lowercase',
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 500,
  },
  copyBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  },
  pre: {
    margin: 0,
    padding: '14px 16px',
    overflowX: 'auto',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: '0.86rem',
    color: '#e5e7eb',
    lineHeight: 1.55,
  },
  tableWrapper: {
    overflowX: 'auto',
    margin: '14px 0',
    borderRadius: '6px',
    border: '1px solid #1f242d',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    backgroundColor: '#14171d',
    borderBottom: '1px solid #282d38',
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: '0.88rem',
    color: '#d1d5db',
  },
  td: {
    borderBottom: '1px solid #1c2027',
    padding: '10px 14px',
    fontSize: '0.88rem',
  },
  blockquote: {
    borderLeft: '3px solid #10b981',
    margin: '12px 0',
    padding: '6px 14px',
    color: '#9ca3af',
    backgroundColor: '#111419',
    borderRadius: '0 6px 6px 0',
  },
};