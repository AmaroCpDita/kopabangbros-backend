console.log('--- INICIANDO DIAGNÓSTICO ---');
import cron from 'node-cron';
import axios from 'axios';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { computePoints } from '../controllers/predictions.controller.js';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/**
 * Devuelve true si hay al menos un partido programado o en vivo HOY (±3 h de margen).
 * Evita llamar a la API externa cuando no hay partidos activos.
 */
const hasTodayMatches = async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000); // hace 3 h
  const windowEnd   = new Date(now.getTime() + 3 * 60 * 60 * 1000); // en 3 h

  const count = await Match.countDocuments({
    status: { $ne: 'finished' },
    date: { $gte: windowStart, $lte: windowEnd }
  });

  return count > 0;
};

// ─────────────────────────────────────────────
//  Lógica principal de actualización
// ─────────────────────────────────────────────

const runApiUpdate = async () => {
  const API_KEY = process.env.FOOTBALL_API_KEY;

  if (!API_KEY) {
    console.warn('[CRON] ADVERTENCIA: Variable FOOTBALL_API_KEY no configurada.');
    return;
  }

  // ── Paso 1: ¿hay partidos hoy? Si no, no gastamos requests ──
  try {
    const active = await hasTodayMatches();
    if (!active) {
      console.log('[CRON] No hay partidos activos ni próximos hoy. Saltando llamada a la API.');
      return;
    }
  } catch (dbErr) {
    console.error('[CRON] Error consultando MongoDB:', dbErr.message);
    return;
  }

  // ── Paso 2: llamamos a la API solo si hace falta ──
  console.log('[CRON] Hay partidos activos/próximos hoy. Consultando API...');
  try {
    const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

    const response = await axios.get(API_URL, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    const requestsAvailable = response.headers['x-requests-available-minute'];
    if (requestsAvailable !== undefined) {
      console.log(`[CRON] Requests disponibles este minuto: ${requestsAvailable}`);
    }

    const matchesData = response.data.matches || [];
    const activeMatches = matchesData.filter(
      m => m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'FINISHED'
    );

    console.log(`[CRON] Partidos activos/finalizados en la API: ${activeMatches.length}`);

    for (const apiMatch of activeMatches) {
      const homeTeam = apiMatch.homeTeam.shortName || apiMatch.homeTeam.name;
      const awayTeam = apiMatch.awayTeam.shortName || apiMatch.awayTeam.name;

      const homeGoals = (apiMatch.score?.regularTime?.home ?? 0) + (apiMatch.score?.extraTime?.home ?? 0);
      const awayGoals = (apiMatch.score?.regularTime?.away ?? 0) + (apiMatch.score?.extraTime?.away ?? 0);
      
      const homePenalties = apiMatch.score?.penalties?.home ?? null;
      const awayPenalties = apiMatch.score?.penalties?.away ?? null;

      let status = 'live';
      if (apiMatch.status === 'FINISHED') status = 'finished';

      const match = await Match.findOne({
        homeTeam: new RegExp(homeTeam, 'i'),
        awayTeam: new RegExp(awayTeam, 'i')
      });

      if (match && (match.status !== 'finished' || match.homeGoals !== homeGoals || match.awayGoals !== awayGoals || match.homePenalties !== homePenalties || match.awayPenalties !== awayPenalties)) {
        match.homeGoals = homeGoals;
        match.awayGoals = awayGoals;
        match.homePenalties = homePenalties;
        match.awayPenalties = awayPenalties;
        match.status = status;
        await match.save();

        console.log(`[CRON] Actualizado ${match.homeTeam} vs ${match.awayTeam} (${status}): ${homeGoals}-${awayGoals} ${homePenalties != null ? `(P: ${homePenalties}-${awayPenalties})` : ''}`);

        const predictions = await Prediction.find({ matchId: match._id.toString() });
        let updatedCount = 0;
        for (const prediction of predictions) {
          prediction.points = computePoints(prediction, { homeGoals, awayGoals });
          await prediction.save();
          updatedCount++;
        }
        if (updatedCount > 0) {
          console.log(`[CRON] Recalculados puntos para ${updatedCount} predicciones.`);
        }
      }
    }

    console.log('[CRON] Ciclo completado.');
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '?';
      console.warn(`[CRON] Rate limit alcanzado (429). Reintentar en ${retryAfter}s. El cron lo reintentará automáticamente en el próximo ciclo.`);
    } else {
      console.error('[CRON] Error al conectar con la API:', error.message);
    }
  }
};

// ─────────────────────────────────────────────
//  Arranque del cron
// ─────────────────────────────────────────────

const startCronJob = () => {
  // Ejecución inicial al arrancar (sin esperar al primer tick)
  console.log('[CRON] Ejecución inicial al arrancar el servidor...');
  runApiUpdate();

  // Cada 5 minutos: seguro dentro del límite de 10 req/min del plan gratuito
  // y solo hace la llamada HTTP externa si hay partidos hoy
  cron.schedule('*/5 * * * *', () => {
    console.log('[CRON] Tick de 5 minutos.');
    runApiUpdate();
  });

  console.log('[CRON] Programado cada 5 minutos (solo activo si hay partidos hoy).');
};

export default startCronJob;
