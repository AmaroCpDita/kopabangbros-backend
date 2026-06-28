import { Group } from '../models/Group.js';
import { User } from '../models/User.js';

// Genera un código alfanumérico único de 6 caracteres
const generateUniqueCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createGroup = async (req, res) => {
  try {
    const { name, adminId } = req.body;
    if (!name || !adminId) return res.status(400).json({ message: 'Nombre y adminId obligatorios' });

    const inviteCode = generateUniqueCode();
    
    const user = await User.findById(adminId);
    if (!user) return res.status(404).json({ message: 'Usuario admin no encontrado' });

    const newGroup = await Group.create({
      name,
      adminId,
      inviteCode,
      members: [adminId] // Admin se une automáticamente
    });

    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el grupo', error: error.message });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { userId, inviteCode } = req.body;
    
    if (!inviteCode || !userId) return res.status(400).json({ message: 'userId e inviteCode obligatorios' });

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) return res.status(404).json({ message: 'Código de invitación inválido' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }

    res.json({ message: 'Unido al grupo exitosamente', group });
  } catch (error) {
    res.status(500).json({ message: 'Error al unirse al grupo', error: error.message });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await Group.find({ members: userId }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los grupos del usuario', error: error.message });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Poblamos los miembros (nombre e email)
    const group = await Group.findById(id).populate('members', 'name email');
    if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });

    // Podemos obtener los puntajes de los miembros cruzando con las predicciones
    // Opcional, pero dejémoslo simple retornando el grupo con members poblados.
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el grupo', error: error.message });
  }
};
