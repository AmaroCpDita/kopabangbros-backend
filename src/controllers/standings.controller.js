import axios from 'axios';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_URL = 'https://api.football-data.org/v4/competitions/WC/standings';

// Traducción de nombres de equipos al español
const teamTranslations = {
  'Germany': 'Alemania', 'United States': 'Estados Unidos', 'USA': 'Estados Unidos',
  'France': 'Francia', 'Spain': 'España', 'England': 'Inglaterra',
  'Netherlands': 'Países Bajos', 'Belgium': 'Bélgica', 'Switzerland': 'Suiza',
  'Italy': 'Italia', 'Morocco': 'Marruecos', 'Japan': 'Japón',
  'South Korea': 'Corea del Sur', 'Korea Republic': 'Corea del Sur',
  'Croatia': 'Croacia', 'Brazil': 'Brasil', 'Cameroon': 'Camerún',
  'South Africa': 'Sudáfrica', "Ivory Coast": 'Costa de Marfil', "Côte d'Ivoire": 'Costa de Marfil',
  'Egypt': 'Egipto', 'Cape Verde Islands': 'Cabo Verde', 'Cabo Verde': 'Cabo Verde',
  'Congo DR': 'R.D. Congo', 'Turkey': 'Turquía', 'Czechia': 'Chequia',
  'Algeria': 'Argelia', 'Tunisia': 'Túnez', 'Saudi Arabia': 'Arabia Saudita',
  'New Zealand': 'Nueva Zelanda', 'Peru': 'Perú', 'Panama': 'Panamá',
  'Sweden': 'Suecia', 'Norway': 'Noruega', 'Scotland': 'Escocia',
  'Bosnia-Herzegovina': 'Bosnia-Herz.', 'Curaçao': 'Curazao',
  'Canada': 'Canadá', 'Mexico': 'México', 'Haiti': 'Haití',
  'Wales': 'Gales', 'Poland': 'Polonia', 'Denmark': 'Dinamarca',
  'Serbia': 'Serbia', 'Senegal': 'Senegal', 'Ecuador': 'Ecuador',
  'Qatar': 'Catar', 'Iran': 'Irán', 'Iraq': 'Irak', 'Jordan': 'Jordania',
  'Uzbekistan': 'Uzbekistán', 'Austria': 'Austria', 'Paraguay': 'Paraguay',
  'Colombia': 'Colombia', 'Ghana': 'Ghana', 'Argentina': 'Argentina',
  'Australia': 'Australia', 'Portugal': 'Portugal', 'Uruguay': 'Uruguay',
  'Chile': 'Chile', 'Venezuela': 'Venezuela', 'Bolivia': 'Bolivia',
  'Costa Rica': 'Costa Rica',
};

const flagMap = {
  'Argentina': '🇦🇷', 'Brasil': '🇧🇷', 'Francia': '🇫🇷',
  'España': '🇪🇸', 'Estados Unidos': '🇺🇸', 'Senegal': '🇸🇳',
  'México': '🇲🇽', 'Canadá': '🇨🇦', 'Alemania': '🇩🇪',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹', 'Países Bajos': '🇳🇱',
  'Italia': '🇮🇹', 'Uruguay': '🇺🇾', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Perú': '🇵🇪',
  'Ecuador': '🇪🇨', 'Japón': '🇯🇵', 'Corea del Sur': '🇰🇷',
  'Marruecos': '🇲🇦', 'Croacia': '🇭🇷', 'Bélgica': '🇧🇪',
  'Suiza': '🇨🇭', 'Sudáfrica': '🇿🇦', 'Chequia': '🇨🇿', 'Bosnia-Herz.': '🇧🇦',
  'Paraguay': '🇵🇾', 'Argelia': '🇩🇿', 'Australia': '🇦🇺', 'Nueva Zelanda': '🇳🇿',
  'Ghana': '🇬🇭', 'Egipto': '🇪🇬', 'Arabia Saudita': '🇸🇦', 'Túnez': '🇹🇳',
  'Turquía': '🇹🇷', 'Irán': '🇮🇷', 'Cabo Verde': '🇨🇻', 'R.D. Congo': '🇨🇩',
  'Costa de Marfil': '🇨🇮', 'Catar': '🇶🇦', 'Jordania': '🇯🇴', 'Irak': '🇮🇶',
  'Uzbekistán': '🇺🇿', 'Noruega': '🇳🇴', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Curazao': '🇨🇼',
  'Suecia': '🇸🇪', 'Austria': '🇦🇹', 'Brasil': '🇧🇷', 'Camerún': '🇨🇲',
  'Panamá': '🇵🇦', 'Haití': '🇭🇹', 'Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Polonia': '🇵🇱',
  'Dinamarca': '🇩🇰', 'Serbia': '🇷🇸', 'Costa Rica': '🇨🇷',
};

export const getStandings = async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ message: 'API key no configurada' });

    const response = await axios.get(API_URL, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    const standings = response.data.standings || [];
    
    // Filtrar solo grupos (type === 'TOTAL' y tienen group)
    const groupStandings = standings
      .filter(s => s.type === 'TOTAL' && s.group && s.group.startsWith('Group'))
      .map(s => ({
        group: s.group,
        table: s.table.map(entry => {
          const nameRaw = entry.team?.shortName || entry.team?.name || '???';
          const nameEs = teamTranslations[nameRaw] || nameRaw;
          return {
            position: entry.position,
            team: nameEs,
            flag: flagMap[nameEs] || '🏳️',
            playedGames: entry.playedGames,
            won: entry.won,
            draw: entry.draw,
            lost: entry.lost,
            points: entry.points,
            goalsFor: entry.goalsFor,
            goalsAgainst: entry.goalsAgainst,
            goalDifference: entry.goalDifference,
          };
        })
      }));

    res.json(groupStandings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tablas', error: error.message });
  }
};
