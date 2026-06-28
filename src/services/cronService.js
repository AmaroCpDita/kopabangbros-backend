import cron from 'node-cron';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Match } from '../models/Match.js';
import { Prediction } from '../models/Prediction.js';
import { computePoints } from '../controllers/predictions.controller.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const startCronJob = () => {
  // Ejecutar cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Iniciando web scraping de resultados en Google Sports...');
    try {
      const SCRAPE_URL = process.env.SCRAPE_URL || 'https://www.google.com/search?q=resultados+partidos+futbol+hoy&hl=es';
      
      let html;
      try {
        // Delay aleatorio entre 5 y 15 segundos (5000ms - 15000ms) ejecutado ANTES de la petición
        const delay = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
        console.log(`[CRON] Pausa anti-bot: Esperando ${(delay / 1000).toFixed(1)} segundos...`);
        await sleep(delay);

        const response = await axios.get(SCRAPE_URL, {
          headers: {
            // User-Agent de navegador real para evitar bloqueos
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9', // Asegura resultados en español
            'Referer': 'https://www.google.com/'
          }
        });
        html = response.data;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.warn('[CRON] Advertencia: Límite de peticiones excedido (Error 429). Se reintentará en el próximo ciclo.');
        } else {
          console.warn(`[CRON] Advertencia: No se pudo acceder a la URL. Error: ${error.message}`);
        }
        return; // Salir de esta iteración si falla la conexión
      }

      const $ = cheerio.load(html);
      const matchesData = [];

      // Selectores estables de Google indicados
      $('div.imso-mh').each((index, element) => {
        const statusText = $(element).find('span.imso_mh__ft-mtch').text().trim().toLowerCase();
        
        // Verifica si el partido finalizó
        if (statusText.includes('finalizado') || statusText.includes('terminado') || statusText.includes('ft')) {
          const homeTeam = $(element).find('div.ellipsisize.imso_mh__first-tn-ed').text().trim();
          const awayTeam = $(element).find('div.ellipsisize.imso_mh__second-tn-ed').text().trim();
          
          // Los marcadores suelen estar en el mismo selector, el primero es local y el segundo visitante
          const scores = $(element).find('div.imso_mh__l-tm-sc');
          
          let homeGoals = NaN;
          let awayGoals = NaN;
          
          if (scores.length >= 2) {
             homeGoals = parseInt($(scores[0]).text().trim(), 10);
             awayGoals = parseInt($(scores[1]).text().trim(), 10);
          }

          if (homeTeam && awayTeam && !isNaN(homeGoals) && !isNaN(awayGoals)) {
            matchesData.push({ homeTeam, awayTeam, homeGoals, awayGoals });
          }
        }
      });

      console.log(`[CRON] Encontrados ${matchesData.length} partidos finalizados en Google.`);

      for (const scrapedMatch of matchesData) {
        // Buscamos el partido por el nombre de los equipos
        const match = await Match.findOne({ 
          homeTeam: scrapedMatch.homeTeam, 
          awayTeam: scrapedMatch.awayTeam 
        });
        
        // Si existe en nuestra base de datos y no ha sido procesado aún
        if (match && match.status !== 'finished') {
          match.homeGoals = scrapedMatch.homeGoals;
          match.awayGoals = scrapedMatch.awayGoals;
          match.status = 'finished';
          await match.save();
          
          console.log(`[CRON] Partido ${match.homeTeam} vs ${match.awayTeam} actualizado a finalizado (${match.homeGoals}-${match.awayGoals}).`);

          // Disparador de puntos: Actualizar predicciones
          const predictions = await Prediction.find({ matchId: match._id.toString() });
          
          let updatedCount = 0;
          for (const prediction of predictions) {
            const points = computePoints(prediction, { homeGoals: match.homeGoals, awayGoals: match.awayGoals });
            prediction.points = points;
            await prediction.save();
            updatedCount++;
          }
          console.log(`[CRON] Recalculados puntos para ${updatedCount} predicciones del partido ${match.homeTeam} vs ${match.awayTeam}.`);
        }
      }
      
      console.log('[CRON] Ciclo de actualización por scraping finalizado exitosamente.');
    } catch (error) {
      console.error('[CRON] Error crítico en el servicio de scraping:', error.message);
    }
  });
};

export default startCronJob;
