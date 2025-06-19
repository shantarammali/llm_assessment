// src/types/index.ts

import { TenantConfig } from '../data/tenantStore';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantConfig;
    }
  }
}
