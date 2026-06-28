import express from 'express';
import { createPrediction, getGroupGlobalScore, calculatePoints, getUserPredictions } from '../controllers/predictions.controller.js';
const router = express.Router();

router.post('/', createPrediction);
router.post('/calculate', calculatePoints);
router.get('/score/:groupId', getGroupGlobalScore);
router.get('/user/:userId/group/:groupId', getUserPredictions);

export default router;
