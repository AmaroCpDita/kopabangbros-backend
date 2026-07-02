import mongoose from 'mongoose';
import express from 'express';
import axios from 'axios';
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
      homePenalties: m.homePenalties,
      awayPenalties: m.awayPenalties,
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
    
    // Fetch from real API
    const API_KEY = process.env.FOOTBALL_API_KEY;
    if (!API_KEY) throw new Error('No FOOTBALL_API_KEY found');
    
    const response = await axios.get('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': API_KEY }
    });

    const phaseMap = {
      'GROUP_STAGE': 'Fase de Grupos',
      'LAST_32': 'Dieciseisavos de Final',
      'LAST_16': 'Octavos de Final',
      'QUARTER_FINALS': 'Cuartos de Final',
      'SEMI_FINALS': 'Semifinal',
      'THIRD_PLACE': 'Tercer Puesto',
      'FINAL': 'Final'
    };

    const matchesToInsert = response.data.matches.map(m => {
      const homeTeam = m.homeTeam?.name || 'TBD';
      let homeGoals = 0, awayGoals = 0;
      if (m.score?.duration === 'PENALTY_SHOOTOUT' || m.score?.duration === 'EXTRA_TIME') {
        homeGoals = (m.score.regularTime?.home ?? 0) + (m.score.extraTime?.home ?? 0);
        awayGoals = (m.score.regularTime?.away ?? 0) + (m.score.extraTime?.away ?? 0);
      } else {
        homeGoals = m.score?.fullTime?.home ?? null;
        awayGoals = m.score?.fullTime?.away ?? null;
      }
      
      return {
        apiId: m.id.toString(),
        homeTeam: m.homeTeam.shortName || m.homeTeam.name,
        awayTeam: m.awayTeam.shortName || m.awayTeam.name,
        homeGoals,
        awayGoals,
        homePenalties: m.score?.penalties?.home ?? null,
        awayPenalties: m.score?.penalties?.away ?? null,
        date: new Date(m.utcDate),
        phase: phaseMap[m.stage] || m.stage,
        status: m.status === 'FINISHED' ? 'finished' : (m.status === 'IN_PLAY' || m.status === 'PAUSED' ? 'live' : 'scheduled')
      };
    });

    await Match.insertMany(matchesToInsert);
    res.json({ message: 'Partidos reales inicializados', count: matchesToInsert.length });
  } catch (error) {
    res.status(500).json({ message: 'Error al seedear', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Iniciar el Cron Job
  startCronJob();
});
