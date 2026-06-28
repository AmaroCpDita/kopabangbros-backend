import { predictions, Prediction } from '../models/Prediction.js';
import { groups } from '../models/Group.js';

export const createPrediction = (req, res) => {
  const { userId, matchId, teamAdvancing, exactResult } = req.body;
  
  const newPrediction = new Prediction(userId, matchId, teamAdvancing, exactResult);
  predictions.push(newPrediction);

  res.status(201).json(newPrediction);
};

export const getGroupScore = (req, res) => {
  const { groupId } = req.params;
  const group = groups.find(g => g.id === groupId);

  if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });

  // Calcular el puntaje sumando los puntos de todas las predicciones 
  // de todos los miembros del grupo.
  const groupPredictions = predictions.filter(p => group.members.includes(p.userId));
  
  const totalScore = groupPredictions.reduce((acc, curr) => acc + curr.points, 0);

  res.json({ groupId, totalScore, groupName: group.name });
};
