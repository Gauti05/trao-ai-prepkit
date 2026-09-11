import mongoose, { Document, Schema } from 'mongoose';
import { IKitData } from '../utils/kitValidator';

// Extend the Zod-inferred interface to include Mongoose document properties and our top-level tracking fields.
// This ensures that the Mongoose schema and the Zod validator stay completely in sync.
export interface IKitDocument extends IKitData, Document {
  ownerId: mongoose.Types.ObjectId;
  status: 'draft' | 'generating' | 'ready' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const requirementSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true },
}, { _id: false });

const questionSchema = new Schema({
  id: { type: String, required: true },
  requirement_ids: [{ type: String }],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'], required: true },
  prompt: { type: String, required: true },
  answer_outline: { type: String, required: true },
  difficulty: { type: Number, required: true, min: 1, max: 3 },
  source: { type: String, enum: ['generated', 'edited', 'manual'], default: 'generated' } // tracking
}, { _id: false });

const flashcardSchema = new Schema({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  requirement_ids: [{ type: String }],
  source: { type: String, enum: ['generated', 'edited', 'manual'], default: 'generated' } // tracking
}, { _id: false });

const kitSchema = new Schema<IKitDocument>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'generating', 'ready', 'failed'], default: 'draft', required: true },
  
  source: {
    company: { type: String, required: true },
    company_url: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String, required: true },
    jd_chars: { type: Number, required: true },
    researched_at: { type: String, required: true },
    pages_used: [{ type: String }]
  },

  company_brief: {
    summary: { type: String, required: true },
    what_they_do: { type: String, required: true },
    sources: [{ type: String }],
    source: { type: String, enum: ['generated', 'edited', 'manual'], default: 'generated' } // tracking
  },

  role: {
    title: { type: String, required: true },
    seniority: { type: String, required: true },
    responsibilities: [{ type: String }],
    requirements: [requirementSchema]
  },

  questions: [questionSchema],
  flashcards: [flashcardSchema],

  schedule: {
    days_available: { type: Number, required: true },
    days: [{
      day: { type: Number, required: true },
      focus: { type: String, required: true },
      question_ids: [{ type: String }],
      minutes: { type: Number, required: true }
    }]
  },

  coverage: {
    uncovered_requirement_ids: [{ type: String }],
    passes: { type: Number, required: true }
  }

}, { timestamps: true });

export const Kit = mongoose.model<IKitDocument>('Kit', kitSchema);
