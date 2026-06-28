import express from 'express';
import { createGroup, joinGroup } from '../controllers/groups.controller.js';

const router = express.Router();

router.post('/', createGroup);
router.post('/join', joinGroup);

export default router;
