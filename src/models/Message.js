import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    waId: { type: String },
    from: { type: String },
    body: { type: String },
    raw: { type: Object }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
