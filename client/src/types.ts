// Add to client/src/types.ts

export type ExperienceLevel = "ENTRY" | "MID" | "SENIOR" | "LEAD";

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