import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  apiId: { type: String, required: true, unique: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  homeGoals: { type: Number, default: null },
  awayGoals: { type: Number, default: null },
  date: { type: Date, required: true },
  phase: { type: String, required: true },
  status: { type: String, default: 'scheduled' } // 'scheduled', 'finished'
}, { timestamps: true });

export const Match = mongoose.model('Match', matchSchema);
