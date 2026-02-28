import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionResponseNote extends Document {
  sessionId: string;
  responseId: string;
  therapistId: string;
  encryptedContent: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionResponseNoteSchema = new Schema<ISessionResponseNote>({
  sessionId: { type: String, required: true, index: true },
  responseId: { type: String, required: true, index: true },
  therapistId: { type: String, required: true, index: true },
  encryptedContent: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<ISessionResponseNote>('SessionResponseNote', SessionResponseNoteSchema);
