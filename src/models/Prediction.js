import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  matchId: { type: String, required: true },
  homeGoals: { type: Number, required: true },
  awayGoals: { type: Number, required: true },
  points: { type: Number, default: 0 }
}, { timestamps: true });

export const Prediction = mongoose.model('Prediction', predictionSchema);
