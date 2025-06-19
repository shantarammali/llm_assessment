import fs from 'fs';
import path from 'path';

export interface TenantConfig {
  tenantId: string;
  encryptedStripeKey?: string;
  encryptedPaypalClientId?: string;
  encryptedPaypalSecret?: string;
  preferredProcessor: 'stripe' | 'paypal' | 'fake';
}

const TENANTS_FILE = path.join(__dirname, 'tenants.json');

// Load tenants from file
export function loadTenants(): Record<string, TenantConfig> {
  try {
    const raw = fs.readFileSync(TENANTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Write tenants to file
function saveTenants(tenants: Record<string, TenantConfig>) {
  fs.writeFileSync(TENANTS_FILE, JSON.stringify(tenants, null, 2));
}

let tenantConfigs: Record<string, TenantConfig> = loadTenants();
export { tenantConfigs };

export function getTenant(tenantId: string): TenantConfig | undefined {
  return tenantConfigs[tenantId];
}

export function getAllTenants(): TenantConfig[] {
  return Object.values(tenantConfigs);
}

export function addTenant(config: TenantConfig): void {
  tenantConfigs[config.tenantId] = config;
  saveTenants(tenantConfigs);
}
