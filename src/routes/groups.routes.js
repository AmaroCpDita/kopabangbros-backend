import express from 'express';
import { createGroup, joinGroup, getGroupById, getUserGroups } from '../controllers/groups.controller.js';

const router = express.Router();

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/:id', getGroupById);
router.get('/user/:userId', getUserGroups);

export default router;
