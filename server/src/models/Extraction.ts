// server/src/models/Extraction.ts
import mongoose, { Schema, Document } from "mongoose";
import { ParsedResume } from "../schemas/resumeSchema";

export interface IExtraction extends Document {
  rawText: string;
  candidate: ParsedResume;
  createdAt: Date;
  updatedAt: Date;
}

const WorkExperienceSchema = new Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
    keyHighlights: [{ type: String }],
  },
  { _id: false }
);

const EducationSchema = new Schema(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    graduationYear: { type: Number, default: null },
  },
  { _id: false }
);

const ExtractionSchema = new Schema<IExtraction>(
  {
    rawText: { type: String, required: true },
    candidate: {
      candidateName: { type: String, required: true },
      email: { type: String, default: null },
      phone: { type: String, default: null },
      location: { type: String, default: null },
      summary: { type: String, default: null },
      experienceLevel: {
        type: String,
        enum: ["ENTRY", "MID", "SENIOR", "LEAD"],
        required: true,
      },
      technicalSkills: [{ type: String }],
      workExperience: [WorkExperienceSchema],
      education: [EducationSchema],
    },
  },
  {
    timestamps: true,
  }
);

export const Extraction = mongoose.model<IExtraction>("Extraction", ExtractionSchema);