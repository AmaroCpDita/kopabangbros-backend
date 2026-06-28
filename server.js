import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Match } from './src/models/Match.js';
import authRoutes from './src/routes/auth.routes.js';
import groupsRoutes from './src/routes/groups.routes.js';
import predictionsRoutes from './src/routes/predictions.routes.js';

console.log('--- CRON SERVICE CARGADO ---');
import startCronJob from './src/services/cronService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kopabangbros')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/predictions', predictionsRoutes);

// Status Route
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'KopaBangBros Backend is running smoothly!' });
});

// Partidos Route
app.get('/api/partidos', async (req, res) => {
  try {
    const matches = await Match.find({}).sort({ date: 1 });
    // Devolver formato limpio
    const formattedMatches = matches.map(m => ({
      id: m._id,
      apiId: m.apiId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      date: m.date,
      phase: m.phase,
      status: m.status
    }));
    res.json(formattedMatches);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los partidos', error: error.message });
  }
});

app.post('/api/partidos/seed', async (req, res) => {
  try {
    await Match.deleteMany({});
    const now = new Date();
    const matches = [
      { apiId: 'm1', homeTeam: 'USA', awayTeam: 'Senegal', date: new Date(now.getTime() + 1000 * 60 * 60 * 2), phase: 'Octavos de Final', status: 'scheduled' },
      { apiId: 'm2', homeTeam: 'Mexico', awayTeam: 'Argentina', date: new Date(now.getTime() + 1000 * 60 * 60 * 4), phase: 'Octavos de Final', status: 'scheduled' },
      { apiId: 'm3', homeTeam: 'Canada', awayTeam: 'France', date: new Date(now.getTime() + 1000 * 60 * 60 * 24), phase: 'Octavos de Final', status: 'scheduled' },
      { apiId: 'm4', homeTeam: 'Brazil', awayTeam: 'Spain', date: new Date(now.getTime() + 1000 * 60 * 60 * 26), phase: 'Octavos de Final', status: 'scheduled' },
      { apiId: 'm5', homeTeam: 'TBD', awayTeam: 'TBD', date: new Date(now.getTime() + 1000 * 60 * 60 * 48), phase: 'Cuartos de Final', status: 'scheduled' },
      { apiId: 'm6', homeTeam: 'TBD', awayTeam: 'TBD', date: new Date(now.getTime() + 1000 * 60 * 60 * 50), phase: 'Cuartos de Final', status: 'scheduled' }
    ];
    await Match.insertMany(matches);
    res.json({ message: 'Partidos inicializados' });
  } catch (error) {
    res.status(500).json({ message: 'Error al inicializar', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Iniciar el Cron Job
  startCronJob();
});
