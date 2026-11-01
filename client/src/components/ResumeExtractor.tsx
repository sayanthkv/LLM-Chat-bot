// client/src/components/ResumeExtractor.tsx
import React, { useState, useEffect } from 'react';
import type { ParsedResume, ExtractionRecord } from '../types';
import { 
  FileText, 
  Sparkles, 
  Briefcase, 
  GraduationCap, 
  Code2, 
  MapPin, 
  Mail, 
  Phone, 
  AlertCircle, 
  Loader2,
  Clock
} from 'lucide-react';

export const ResumeExtractor: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentExtraction, setCurrentExtraction] = useState<ParsedResume | null>(null);
  const [history, setHistory] = useState<ExtractionRecord[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/extractions');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Failed to load past extractions:', err);
    }
  };

  const handleExtract = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setErrorMsg('Please paste some resume text first.');
      return;
    }

    if (trimmed.length < 50) {
      setErrorMsg('Resume text must be at least 50 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://localhost:5000/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Extraction failed');
      }

      // The saved record returned from MongoDB
      setCurrentExtraction(result.data.candidate);
      fetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during extraction';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadPastRecord = (rec: ExtractionRecord) => {
    setCurrentExtraction(rec.candidate);
    setInputText(rec.rawText);
    setErrorMsg(null);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>
          <Sparkles size={22} color="#10b981" />
          <h2>Smart Resume Extractor</h2>
        </div>
        <p style={styles.headerSubtitle}>
          Transforms messy resume text into structured, Zod-validated candidate records.
        </p>
      </header>

      <div style={styles.grid}>
        {/* Left Column: Input + History */}
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <label style={styles.label}>
              <FileText size={16} color="#9ca3af" />
              <span>Unformatted Resume Text</span>
            </label>
            <textarea
              style={styles.textarea}
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw resume, LinkedIn summary, or bio text here (min 50 chars)..."
              disabled={loading}
            />
            <div style={styles.actionRow}>
              <span style={styles.charCount}>
                {inputText.length} characters
              </span>
              <button
                style={{
                  ...styles.submitBtn,
                  opacity: loading || inputText.trim().length < 50 ? 0.6 : 1,
                  cursor: loading || inputText.trim().length < 50 ? 'not-allowed' : 'pointer',
                }}
                onClick={handleExtract}
                disabled={loading || inputText.trim().length < 50}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Extracting & Validating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Extract Candidate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div style={styles.errorBanner}>
              <AlertCircle size={16} color="#ef4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Past History */}
          <div style={styles.historyCard}>
            <h4 style={styles.historyTitle}>
              <Clock size={16} color="#9ca3af" />
              <span>Saved Candidates ({history.length})</span>
            </h4>
            <div style={styles.historyList}>
              {history.length === 0 ? (
                <div style={styles.emptyHistory}>No extractions stored yet.</div>
              ) : (
                history.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => loadPastRecord(item)}
                    style={styles.historyItem}
                  >
                    <div style={styles.historyName}>
                      {item.candidate.candidateName}
                    </div>
                    <span style={styles.historyBadge}>
                      {item.candidate.experienceLevel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Output Display */}
        <div style={styles.rightCol}>
          {currentExtraction ? (
            <div style={styles.resultCard}>
              {/* Top Banner */}
              <div style={styles.candidateHeader}>
                <div>
                  <h3 style={styles.candidateName}>
                    {currentExtraction.candidateName}
                  </h3>
                  <div style={styles.contactRow}>
                    {currentExtraction.email && (
                      <span style={styles.contactItem}>
                        <Mail size={13} color="#9ca3af" />
                        {currentExtraction.email}
                      </span>
                    )}
                    {currentExtraction.phone && (
                      <span style={styles.contactItem}>
                        <Phone size={13} color="#9ca3af" />
                        {currentExtraction.phone}
                      </span>
                    )}
                    {currentExtraction.location && (
                      <span style={styles.contactItem}>
                        <MapPin size={13} color="#9ca3af" />
                        {currentExtraction.location}
                      </span>
                    )}
                  </div>
                </div>
                <span style={styles.levelBadge}>
                  {currentExtraction.experienceLevel}
                </span>
              </div>

              {currentExtraction.summary && (
                <p style={styles.summary}>{currentExtraction.summary}</p>
              )}

              {/* Skills */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  <Code2 size={16} color="#10b981" />
                  <span>Technical Skills</span>
                </div>
                <div style={styles.skillsWrapper}>
                  {currentExtraction.technicalSkills.map((skill, idx) => (
                    <span key={idx} style={styles.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  <Briefcase size={16} color="#10b981" />
                  <span>Work Experience</span>
                </div>
                <div style={styles.timeline}>
                  {currentExtraction.workExperience.map((exp, idx) => (
                    <div key={idx} style={styles.timelineItem}>
                      <div style={styles.jobHeader}>
                        <strong style={styles.jobRole}>{exp.role}</strong>
                        <span style={styles.jobCompany}>@ {exp.company}</span>
                        {(exp.startDate || exp.endDate) && (
                          <span style={styles.jobDates}>
                            ({exp.startDate || 'N/A'} - {exp.endDate || 'Present'})
                          </span>
                        )}
                      </div>
                      <ul style={styles.highlightsList}>
                        {exp.keyHighlights.map((hl, hIdx) => (
                          <li key={hIdx}>{hl}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              {currentExtraction.education.length > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <GraduationCap size={16} color="#10b981" />
                    <span>Education</span>
                  </div>
                  {currentExtraction.education.map((edu, idx) => (
                    <div key={idx} style={styles.eduItem}>
                      <div>
                        <strong>{edu.degree}</strong> — {edu.institution}
                      </div>
                      {edu.graduationYear && (
                        <span style={styles.eduYear}>{edu.graduationYear}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.placeholderCard}>
              <Sparkles size={36} color="#374151" />
              <p style={styles.placeholderText}>
                No candidate extracted yet. Paste resume text on the left and click "Extract Candidate".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    color: '#e5e7eb',
    fontFamily: 'inherit',
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '20px',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f9fafb',
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: '0.88rem',
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '24px',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#12151b',
    border: '1px solid #1f2530',
    borderRadius: '12px',
    padding: '16px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#d1d5db',
    marginBottom: '10px',
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0c0e12',
    border: '1px solid #1f2530',
    borderRadius: '8px',
    padding: '12px',
    color: '#f3f4f6',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.88rem',
    transition: 'all 0.15s ease',
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
    fontSize: '0.85rem',
  },
  historyCard: {
    backgroundColor: '#12151b',
    border: '1px solid #1f2530',
    borderRadius: '12px',
    padding: '16px',
  },
  historyTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.86rem',
    color: '#d1d5db',
    marginBottom: '12px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#161a22',
    border: '1px solid #1f2530',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  historyName: {
    color: '#e5e7eb',
    fontWeight: 500,
  },
  historyBadge: {
    fontSize: '0.72rem',
    padding: '2px 8px',
    borderRadius: '9999px',
    backgroundColor: '#1b2820',
    color: '#34d399',
    fontWeight: 600,
  },
  emptyHistory: {
    color: '#6b7280',
    fontSize: '0.8rem',
    textAlign: 'center',
    padding: '16px',
  },
  resultCard: {
    backgroundColor: '#12151b',
    border: '1px solid #1f2530',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  candidateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #1f2530',
    paddingBottom: '14px',
  },
  candidateName: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  contactRow: {
    display: 'flex',
    gap: '14px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.82rem',
    color: '#9ca3af',
  },
  levelBadge: {
    backgroundColor: '#047857',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  summary: {
    fontSize: '0.88rem',
    color: '#d1d5db',
    lineHeight: 1.55,
    margin: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  skillsWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  skillTag: {
    backgroundColor: '#172026',
    border: '1px solid #243538',
    color: '#34d399',
    padding: '4px 9px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timelineItem: {
    backgroundColor: '#161a22',
    border: '1px solid #1f2530',
    padding: '12px 14px',
    borderRadius: '8px',
  },
  jobHeader: {
    fontSize: '0.88rem',
    marginBottom: '6px',
    color: '#f3f4f6',
  },
  jobRole: {
    fontWeight: 600,
  },
  jobCompany: {
    color: '#10b981',
    marginLeft: '4px',
  },
  jobDates: {
    color: '#9ca3af',
    fontSize: '0.8rem',
    marginLeft: '6px',
  },
  highlightsList: {
    margin: '0 0 0 16px',
    padding: 0,
    fontSize: '0.82rem',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  eduItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.86rem',
    color: '#e5e7eb',
    backgroundColor: '#161a22',
    border: '1px solid #1f2530',
    padding: '10px 12px',
    borderRadius: '6px',
  },
  eduYear: {
    color: '#9ca3af',
  },
  placeholderCard: {
    border: '2px dashed #1f2530',
    borderRadius: '12px',
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: '0.88rem',
    marginTop: '12px',
    maxWidth: '320px',
  },
};