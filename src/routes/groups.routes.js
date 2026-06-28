import express from 'express';
import { createGroup, joinGroup, getGroupById, getUserGroups, deleteGroup } from '../controllers/groups.controller.js';

const router = express.Router();

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/user/:userId', getUserGroups);  // DEBE ir antes que /:id
router.get('/:id', getGroupById);
router.delete('/:id', deleteGroup);

export default router;
