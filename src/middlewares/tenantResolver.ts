// src/middlewares/tenantResolver.ts

import { Request, Response, NextFunction } from 'express';
import { tenantConfigs } from '../data/tenantStore';

interface TenantRequest extends Request {
    tenant?: any; 
}

export function tenantResolver(req: TenantRequest, res: Response, next: NextFunction): void {
  const tenantId = req.header('X-Tenant-ID');

  if (!tenantId || !tenantConfigs[tenantId]) {
    res.status(403).json({ error: 'Invalid or missing tenant ID' });
    return;
  }

  // Attach tenant info to request
  req.tenant = tenantConfigs[tenantId];
  next();
}
