// src/middlewares/tenantAuth.ts

import { Request, Response, NextFunction } from 'express';
import { tenantConfigs } from '../data/tenantStore';

interface AuthRequest extends Request {
  tenant?: any;
}

export function tenantAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const { tenantId } = req.params;

  const tenant = tenantConfigs[tenantId];
  if (!tenant) {
    res.status(403).json({ error: 'Invalid tenant ID' });
    return;
  }

  req.tenant = tenant;
  next();
}
