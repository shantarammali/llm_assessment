// src/routes/payment.ts

import express, { Request, Response } from 'express';
import { tenantAuth } from '../middlewares/tenantAuth';
import { processPayment } from '../services/paymentService';
import { getLLMSummary } from '../services/llmServiceForPayments';
import { getTransactionsForTenant } from '../logs/transactionLogger';
import { addTenant, getAllTenants, getTenant, loadTenants } from '../data/tenantStore';
import { encrypt } from '../utils/cryptoHelper';
import crypto from 'crypto';
import { authenticateJWT, requireRole, requireTenantAccess } from '../middlewares/auth';


const router = express.Router();

interface AuthRequest extends Request {
    tenant?: any;
}

router.post('/tenants/create', requireRole('admin'), (req: Request, res: Response): void => {
    const { tenantId, preferredProcessor = 'stripe' } = req.body;

    if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
    }

    if (getTenant(tenantId)) {
        res.status(409).json({ error: 'Tenant already exists' });
        return;
    }

    // Mock API keys based on processor
    const mockStripeKey = `sk_test_${crypto.randomBytes(8).toString('hex')}`;
    const mockPaypalId = `paypal_${crypto.randomBytes(4).toString('hex')}`;
    const mockPaypalSecret = `secret_${crypto.randomBytes(4).toString('hex')}`;

    const config = {
        tenantId,
        preferredProcessor,
        encryptedStripeKey: preferredProcessor === 'stripe' ? encrypt(mockStripeKey) : undefined,
        encryptedPaypalClientId: preferredProcessor === 'paypal' ? encrypt(mockPaypalId) : undefined,
        encryptedPaypalSecret: preferredProcessor === 'paypal' ? encrypt(mockPaypalSecret) : undefined,
    };

    addTenant(config);
    res.status(201).json({ message: 'Tenant onboarded into json file', tenantId });
});

router.post('/tenants/:tenantId/pay', authenticateJWT, requireRole('admin'), requireTenantAccess(), tenantAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    const { amount, currency, source } = req.body;
    const tenant = req.tenant;

    if (!amount || !currency || !source) {
        res.status(400).json({ error: 'Missing required payment fields' });
        return;
    }

    const tenants = loadTenants();
    if (!tenants[tenant.tenantId]) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
    }

    try {
        console.log('Processing payment for tenant:', tenant?.tenantId);
        const result = await processPayment(tenant!, amount, currency, source);
        res.status(result.success ? 200 : 402).json({
            ...result,
        });
    } catch (err) {
        res.status(500).json({ error: 'Unexpected error processing payment' + err });
    }
});

router.get('/tenants/:tenantId/summary', authenticateJWT, tenantAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    const tenant = req.tenant!;
    const transactions = getTransactionsForTenant(tenant.tenantId);

    if (!transactions.length) {
        res.status(404).json({ error: 'No transactions found for tenant' });
        return;
    }

    // Build summary prompt
    const recent = transactions.slice(-5); // last 5
    const formatted = recent
        .map(t => `Amount: ${t.amount} ${t.currency}, Success: ${t.success}, Timestamp: ${t.timestamp}`)
        .join('\n');

    const prompt = `
  Generate a brief activity summary and risk profile for tenant "${tenant.tenantId}" based on these transactions:
  
  ${formatted}
  
  Output should assess overall risk and describe trends or anomalies.
  `;

    try {
        const explanation = await getLLMSummary(prompt);
        res.json({ tenantId: tenant.tenantId, summary: explanation });
    } catch (err) {
        res.status(500).json({ error: 'LLM failed to generate summary' });
    }
});

router.get('/tenants/:tenantId/status', authenticateJWT, requireTenantAccess(), async (req: AuthRequest, res: Response): Promise<void> => {
    const tenantId = req.params.tenantId;
    const tenant = getTenant(tenantId);
    if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
    }
    try {
        const { summary } = await require('../services/paymentService').getCircuitBreakerSummary(tenant);
        res.json({ summary });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

router.get('/status/summary', authenticateJWT, async (req: Request, res: Response) => {
    const tenants = getAllTenants();
    const { getBreakerKey, lastSummaries } = require('../services/paymentService');
    const summaries: Record<string, string> = {};
    for (const tenant of tenants) {
        const key = getBreakerKey(tenant);
        summaries[key] = lastSummaries[key] || 'No recent summary';
    }
    res.json({ summaries });
});

router.get('/status', authenticateJWT, async (req: Request, res: Response) => {
    const { circuitBreakers } = require('../services/paymentService');
    type CircuitBreaker = {
        state: string;
        failures: number;
        lastOpened: number;
        history: { timestamp: number; success: boolean }[];
    };
    const status: Record<string, { circuitState: string; failureCount: number; lastFailure: string | null }> = {};
    for (const [key, breakerRaw] of Object.entries(circuitBreakers)) {
        const breaker = breakerRaw as CircuitBreaker;
        const lastFail = breaker.history.filter((h: { success: boolean }) => !h.success).sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)[0];
        status[key] = {
            circuitState: breaker.state.toLowerCase(),
            failureCount: breaker.failures,
            lastFailure: lastFail ? new Date(lastFail.timestamp).toISOString() : null
        };
    }
    res.json(status);
});

export default router;
