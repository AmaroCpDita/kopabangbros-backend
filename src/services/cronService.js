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
    console.log('[CRON] Iniciando web scraping de resultados en Flashscore...');
    try {
      const SCRAPE_URL = process.env.SCRAPE_URL || 'https://m.flashscore.cl/';
      
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
            'Referer': 'https://www.google.com/' // Mantenemos un referer confiable
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

      // Selectores de Flashscore indicados
      $('.event__match').each((index, element) => {
        // Obtenemos todo el texto del partido para buscar "Finalizado" o "Terminado"
        const matchText = $(element).text().trim().toLowerCase();
        
        // Verifica si el partido finalizó
        if (matchText.includes('finalizado') || matchText.includes('terminado') || matchText.includes('ft')) {
          
          const participants = $(element).find('.event__participant');
          let homeTeam = '';
          let awayTeam = '';
          
          if (participants.length >= 2) {
             homeTeam = $(participants[0]).text().trim();
             awayTeam = $(participants[1]).text().trim();
          }
          
          // Flashscore suele usar .event__score, el formato suele ser "2 - 1" o similar
          const scoreText = $(element).find('.event__score').text().trim();
          let homeGoals = NaN;
          let awayGoals = NaN;
          
          // Buscamos los números en el string del score
          const scoreMatch = scoreText.match(/(\d+)\s*-\s*(\d+)/);
          if (scoreMatch) {
             homeGoals = parseInt(scoreMatch[1], 10);
             awayGoals = parseInt(scoreMatch[2], 10);
          }

          if (homeTeam && awayTeam && !isNaN(homeGoals) && !isNaN(awayGoals)) {
            matchesData.push({ homeTeam, awayTeam, homeGoals, awayGoals });
          }
        }
      });

      console.log(`[CRON] Encontrados ${matchesData.length} partidos finalizados en Flashscore.`);

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
