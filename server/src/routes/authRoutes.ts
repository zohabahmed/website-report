import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/repository.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'website-maintenance-reporter-secret-key-2026';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash || user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: payload });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = {
      id: uuidv4(),
      email,
      name,
      passwordHash,
      role: 'admin',
    };

    await db.createUser(newUser);

    const payload = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: payload });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
