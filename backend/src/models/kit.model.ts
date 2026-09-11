import mongoose, { Document, Schema } from 'mongoose';

export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'generating' | 'completed' | 'failed';
  stage: 'crawling' | 'extracting' | 'generating' | 'checking_coverage' | 'scheduling' | 'ready';
  error?: string;
  data?: any; // The final IKitData
  rawContext?: any; // { about: string[], hiring: string[] }
  jdHash: string;
  jd: string;
  companyUrl: string;
  days: number;
  createdAt: Date;
  updatedAt: Date;
}

const KitSchema = new Schema<IKit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
      type: String, 
      enum: ['generating', 'completed', 'failed'], 
      default: 'generating' 
    },
    stage: {
      type: String,
      enum: ['crawling', 'extracting', 'generating', 'checking_coverage', 'scheduling', 'ready'],
      default: 'crawling'
    },
    error: { type: String },
    data: { type: Schema.Types.Mixed },
    rawContext: { type: Schema.Types.Mixed },
    jdHash: { type: String, required: true },
    jd: { type: String, required: true },
    companyUrl: { type: String, required: true },
    days: { type: Number, required: true }
  },
  { timestamps: true }
);

export const KitModel = mongoose.model<IKit>('Kit', KitSchema);
