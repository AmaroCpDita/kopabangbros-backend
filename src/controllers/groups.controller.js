import { groups, Group } from '../models/Group.js';
import { users } from '../models/User.js';

export const createGroup = (req, res) => {
  const { name, adminId } = req.body;
  if (!name || !adminId) return res.status(400).json({ message: 'Nombre y adminId obligatorios' });

  const newGroup = new Group(name, adminId);
  groups.push(newGroup);

  // Update user group
  const user = users.find(u => u.id === adminId);
  if (user) user.groupId = newGroup.id;

  res.status(201).json(newGroup);
};

export const joinGroup = (req, res) => {
  const { userId, inviteCode } = req.body;
  const group = groups.find(g => g.inviteCode === inviteCode);

  if (!group) return res.status(404).json({ message: 'Código de invitación inválido' });
  
  if (!group.members.includes(userId)) {
    group.members.push(userId);
  }

  const user = users.find(u => u.id === userId);
  if (user) user.groupId = group.id;

  res.json({ message: 'Unido al grupo exitosamente', group });
};
