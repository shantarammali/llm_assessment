// src/middlewares/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../data/userStore';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

// Attach user object to request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Middleware to verify token and attach user
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, JWT_SECRET) as User;
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalid or expired' });
    return;
  }
}

// ✅ Role Guard
export function requireRole(role: 'admin' | 'viewer') {    
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body.user?.role !== role) {
      res.status(403).json({ error: 'Access denied: insufficient role' });
      return;
    }
    next();
  };
}

// ✅ Tenant Guard
export function requireTenantAccess() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { tenantId } = req.params;
    if (!tenantId || !req.user?.tenants.includes(tenantId)) {
      res.status(403).json({ error: 'Access denied: tenant restricted' });
      return;
    }
    next();
  };
}
