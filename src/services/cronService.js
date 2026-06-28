console.log('--- INICIANDO DIAGNÓSTICO ---');
import cron from 'node-cron';
import axios from 'axios';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { computePoints } from '../controllers/predictions.controller.js';

const runApiUpdate = async () => {
  console.log('[CRON] Iniciando actualización de resultados vía API Oficial...');
  try {
    // URL de la API oficial para el Mundial (WC = World Cup)
    const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
    const API_KEY = process.env.FOOTBALL_API_KEY;

    if (!API_KEY) {
      console.warn('[CRON] ADVERTENCIA: Variable FOOTBALL_API_KEY no configurada. Consigue una gratis en football-data.org.');
      return;
    }

    const response = await axios.get(API_URL, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    const matchesData = response.data.matches || [];
    // Filtramos los que están en juego, en pausa (medio tiempo) o terminados
    const activeMatches = matchesData.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'FINISHED');

    console.log(`[CRON] Encontrados ${activeMatches.length} partidos activos/finalizados en la API.`);

    for (const apiMatch of activeMatches) {
      const homeTeam = apiMatch.homeTeam.shortName || apiMatch.homeTeam.name;
      const awayTeam = apiMatch.awayTeam.shortName || apiMatch.awayTeam.name;
      
      // Tomamos el resultado (fullTime o regularTime según esté disponible)
      const homeGoals = apiMatch.score?.fullTime?.home ?? apiMatch.score?.regularTime?.home ?? 0;
      const awayGoals = apiMatch.score?.fullTime?.away ?? apiMatch.score?.regularTime?.away ?? 0;
      
      let status = 'live';
      if (apiMatch.status === 'FINISHED') status = 'finished';

      // Buscamos el partido (es ideal asegurar que los nombres en BD coincidan con la API o usar regex)
      const match = await Match.findOne({ 
        homeTeam: new RegExp(homeTeam, 'i'), 
        awayTeam: new RegExp(awayTeam, 'i') 
      });
      
      // Actualizamos si el partido en BD no está terminado o si los goles/estado han cambiado
      if (match && (match.status !== 'finished' || match.homeGoals !== homeGoals || match.awayGoals !== awayGoals)) {
        match.homeGoals = homeGoals;
        match.awayGoals = awayGoals;
        match.status = status;
        await match.save();
        
        console.log(`[CRON] Partido ${match.homeTeam} vs ${match.awayTeam} actualizado (${match.status}): ${match.homeGoals}-${match.awayGoals}.`);

        // Disparador de puntos: Actualizar predicciones
        const predictions = await Prediction.find({ matchId: match._id.toString() });
        
        let updatedCount = 0;
        for (const prediction of predictions) {
          const points = computePoints(prediction, { homeGoals: match.homeGoals, awayGoals: match.awayGoals });
          prediction.points = points;
          await prediction.save();
          updatedCount++;
        }
        console.log(`[CRON] Recalculados puntos para ${updatedCount} predicciones.`);
      }
    }
    
    console.log('[CRON] Ciclo de actualización vía API finalizado exitosamente.');
  } catch (error) {
    console.error('[CRON] Error crítico en la conexión a la API:', error.message);
  }
};

const startCronJob = () => {
  // Ejecutar inmediatamente al arrancar el servidor
  console.log('[CRON] Ejecución inmediata inicial solicitada...');
  runApiUpdate();

  // Y luego programar para que se repita cada 2 minutos
  // El límite gratuito de la API es 10 peticiones por minuto, estamos muy seguros con 1 cada 2 min.
  cron.schedule('*/2 * * * *', runApiUpdate);
};

export default startCronJob;
