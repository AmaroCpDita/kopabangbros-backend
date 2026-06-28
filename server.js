import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/predictions', predictionsRoutes);

// Status Route
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'KopaBangBros Backend is running smoothly!' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Iniciar el Cron Job
  startCronJob();
});
