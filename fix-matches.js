import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Match } from './src/models/Match.js';
import axios from 'axios';

dotenv.config();

async function fixMatches() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const API_KEY = process.env.FOOTBALL_API_KEY;
  const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

  const response = await axios.get(API_URL, { headers: { 'X-Auth-Token': API_KEY } });
  const matchesData = response.data.matches || [];

  let updatedCount = 0;

  for (const apiMatch of matchesData) {
    if (apiMatch.status !== 'FINISHED') continue;

    let homeGoals = 0, awayGoals = 0;
    if (apiMatch.score?.duration === 'PENALTY_SHOOTOUT' || apiMatch.score?.duration === 'EXTRA_TIME') {
      homeGoals = (apiMatch.score.regularTime?.home ?? 0) + (apiMatch.score.extraTime?.home ?? 0);
      awayGoals = (apiMatch.score.regularTime?.away ?? 0) + (apiMatch.score.extraTime?.away ?? 0);
    } else {
      homeGoals = apiMatch.score?.fullTime?.home ?? 0;
      awayGoals = apiMatch.score?.fullTime?.away ?? 0;
    }

    const homePenalties = apiMatch.score?.penalties?.home ?? null;
    const awayPenalties = apiMatch.score?.penalties?.away ?? null;

    const dbMatch = await Match.findOne({ apiId: apiMatch.id.toString() });

    if (dbMatch) {
      if (dbMatch.homeGoals !== homeGoals || dbMatch.awayGoals !== awayGoals || dbMatch.homePenalties !== homePenalties) {
        dbMatch.homeGoals = homeGoals;
        dbMatch.awayGoals = awayGoals;
        dbMatch.homePenalties = homePenalties;
        dbMatch.awayPenalties = awayPenalties;
        await dbMatch.save();
        console.log(`Fixed match ${dbMatch.apiId}: ${homeGoals}-${awayGoals} (P: ${homePenalties}-${awayPenalties})`);
        updatedCount++;
      }
    }
  }

  console.log(`Finished. Updated ${updatedCount} matches.`);
  process.exit(0);
}

fixMatches().catch(console.error);
