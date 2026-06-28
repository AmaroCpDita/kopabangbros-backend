import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import groupsRoutes from './src/routes/groups.routes.js';
import predictionsRoutes from './src/routes/predictions.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
});
