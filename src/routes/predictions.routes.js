import express from 'express';
import { createPrediction, getGroupScore } from '../controllers/predictions.controller.js';

const router = express.Router();

router.post('/', createPrediction);
router.get('/score/:groupId', getGroupScore);

export default router;
