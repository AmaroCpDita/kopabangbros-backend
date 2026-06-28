import jwt from 'jsonwebtoken';
import { users, User } from '../models/User.js';

export const register = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ message: 'El usuario ya existe' });

  const newUser = new User(name, email, password);
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });
  res.status(201).json({ user: newUser, token });
};

export const login = (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });
  res.json({ user, token });
};
