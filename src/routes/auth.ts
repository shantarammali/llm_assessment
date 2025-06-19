import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { findUser, verifyPassword } from '../data/userStore';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET!;

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const user = findUser(username);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await verifyPassword(user, password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    {
      username: user.username,
      role: user.role,
      tenants: user.tenants,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});


export default router;
