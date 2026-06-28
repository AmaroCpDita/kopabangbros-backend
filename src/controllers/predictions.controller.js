import { Prediction } from '../models/Prediction.js';
import { Group } from '../models/Group.js';

export const createPrediction = async (req, res) => {
  try {
    const { userId, matchId, homeGoals, awayGoals } = req.body;
    
    // Usamos findOneAndUpdate con upsert para evitar duplicados del mismo partido por el mismo usuario
    const newPrediction = await Prediction.findOneAndUpdate(
      { userId, matchId },
      { homeGoals, awayGoals },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(newPrediction);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la predicción', error: error.message });
  }
};

export const calculatePoints = async (req, res) => {
  try {
    const { predictionId, resultadoReal } = req.body;
    
    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ message: 'Predicción no encontrada' });
    }

    let points = 0;
    
    const predDiff = prediction.homeGoals - prediction.awayGoals;
    const realDiff = resultadoReal.homeGoals - resultadoReal.awayGoals;

    // a) Pleno (5 pts)
    if (prediction.homeGoals === resultadoReal.homeGoals && prediction.awayGoals === resultadoReal.awayGoals) {
      points = 5;
    } 
    // b) Diferencia Exacta (3 pts)
    else if (predDiff === realDiff) {
      points = 3;
    }
    // c) Tendencia/Ganador (1 pt)
    else if (Math.sign(predDiff) === Math.sign(realDiff)) {
      points = 1;
    }
    // d) Fallo (0 pts)
    else {
      points = 0;
    }

    prediction.points = points;
    await prediction.save();

    res.json({ message: 'Puntos calculados correctamente', points, prediction });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular puntos', error: error.message });
  }
};

export const getGroupGlobalScore = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });

    // Buscar predicciones de todos los miembros del grupo usando $in de Mongoose
    const groupPredictions = await Prediction.find({ userId: { $in: group.members } });
    
    const totalScore = groupPredictions.reduce((acc, curr) => acc + curr.points, 0);

    res.json({ groupId, totalScore, groupName: group.name });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener puntaje global', error: error.message });
  }
};

export const getUserPredictions = async (req, res) => {
  try {
    const { userId } = req.params;
    const userPredictions = await Prediction.find({ userId });
    res.json(userPredictions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener predicciones', error: error.message });
  }
};
