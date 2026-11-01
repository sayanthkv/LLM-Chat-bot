// client/src/types.ts

// --- Chat Interface Types ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string | Date;
}

export interface ConversationSummary {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// --- Resume Extractor Types ---
export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD';

export interface WorkExperience {
  company: string;
  role: string;
  startDate?: string | null;
  endDate?: string | null;
  keyHighlights: string[];
}

export interface Education {
  institution: string;
  degree: string;
  graduationYear?: number | null;
}

export interface ParsedResume {
  candidateName: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  experienceLevel: ExperienceLevel;
  technicalSkills: string[];
  workExperience: WorkExperience[];
  education: Education[];
}

export interface ExtractionRecord {
  _id: string;
  rawText: string;
  candidate: ParsedResume;
  createdAt: string;
  updatedAt: string;
}