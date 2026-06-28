import express from 'express';
import { createGroup, joinGroup, getGroupById } from '../controllers/groups.controller.js';

const router = express.Router();

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/:id', getGroupById);

export default router;
