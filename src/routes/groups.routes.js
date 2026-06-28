import express from 'express';
import { createGroup, joinGroup, getGroupById, getUserGroups } from '../controllers/groups.controller.js';

const router = express.Router();

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/user/:userId', getUserGroups);  // DEBE ir antes que /:id
router.get('/:id', getGroupById);

export default router;
