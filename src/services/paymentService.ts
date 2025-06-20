// src/services/paymentService.ts

import { TenantConfig } from '../data/tenantStore';
import { decrypt } from '../utils/cryptoHelper';
import { logTransaction } from '../logs/transactionLogger';
import { getLLMSummary } from '../services/llmServiceForPayments';
import { metricsService } from './metricsService';
import { persistenceService } from './persistenceService';

// --- Circuit Breaker Logic ---
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
interface AttemptHistory {
  timestamp: number;
  success: boolean;
  reason?: string;
}
interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  lastOpened: number;
  history: AttemptHistory[];
}
export const circuitBreakers: Record<string, CircuitBreaker> = {};
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

// Store last LLM summaries for each breaker key
export const lastSummaries: Record<string, string> = {};

// Initialize persistence service
persistenceService.initialize().then(async () => {
  try {
    const { circuitBreakers: savedBreakers, lastSummaries: savedSummaries } = await persistenceService.loadCircuitBreakerState();
    
    // Restore circuit breaker state
    Object.assign(circuitBreakers, savedBreakers);
    Object.assign(lastSummaries, savedSummaries);
    
    console.log(`Restored ${Object.keys(savedBreakers).length} circuit breakers and ${Object.keys(savedSummaries).length} summaries`);
  } catch (error) {
    console.error('Failed to restore circuit breaker state:', error);
  }
});

// Set up periodic saving
setInterval(async () => {
  try {
    await persistenceService.saveCircuitBreakerState(circuitBreakers, lastSummaries);
  } catch (error) {
    console.error('Failed to save circuit breaker state:', error);
  }
}, 30000); // Save every 30 seconds

export function getBreakerKey(tenant: TenantConfig) {
  return `${tenant.tenantId}:${tenant.preferredProcessor}`;
}

function getCircuitBreaker(tenant: TenantConfig): CircuitBreaker {
  const key = getBreakerKey(tenant);
  if (!circuitBreakers[key]) {
    circuitBreakers[key] = { state: 'CLOSED', failures: 0, lastOpened: 0, history: [] };
  }
  return circuitBreakers[key];
}

function recordAttempt(breaker: CircuitBreaker, success: boolean, reason?: string) {
  breaker.history.push({ timestamp: Date.now(), success, reason });
  // Keep only last 10 minutes
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  breaker.history = breaker.history.filter(h => h.timestamp >= tenMinAgo);
}

function recordStateTransition(breakerKey: string, from: CircuitState, to: CircuitState, reason: string) {
  metricsService.recordStateTransition(breakerKey, from, to, reason);
}

export async function getCircuitBreakerSummary(tenant: TenantConfig): Promise<{ summary: string }> {
  const breaker = getCircuitBreaker(tenant);
  const now = Date.now();
  const tenMinAgo = now - 10 * 60 * 1000;
  const recent = breaker.history.filter(h => h.timestamp >= tenMinAgo);
  const total = recent.length;
  const failed = recent.filter(h => !h.success).length;
  const percentFailed = total > 0 ? Math.round((failed / total) * 100) : 0;
  const state = breaker.state;
  const reason = state === 'OPEN' ? 'The circuit breaker is currently open, blocking new attempts.' :
    state === 'HALF_OPEN' ? 'The circuit breaker is half-open, allowing a test request.' :
    'The circuit breaker is closed.';
  const prompt = `In the last 10 minutes, ${percentFailed}% of payment attempts failed due to provider instability. ${reason}`;
  // Use real or mock LLM
  const summary = await getLLMSummary(prompt);
  return { summary };
}

async function retryWithBackoff(
  fn: () => Promise<{ success: boolean; message: string; transactionId: string }>,
  retries = 3,
  delays = [500, 1000, 2000]
): Promise<{ success: boolean; message: string; transactionId: string; retryCount: number }> {
  let lastResult: { success: boolean; message: string; transactionId: string } = { success: false, message: 'No attempts made', transactionId: 'N/A' };
  let retryCount = 0;
  
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result.success) return { ...result, retryCount };
    lastResult = result;
    retryCount++;
    if (i < delays.length) await new Promise(res => setTimeout(res, delays[i]));
  }
  return { ...lastResult, retryCount };
}

export async function processPayment(
  tenant: TenantConfig,
  amount: number,
  currency: string,
  source: string
): Promise<{ success: boolean; transactionId: string; message: string }> {
  const startTime = Date.now();
  let result: { success: boolean; transactionId: string; message: string; retryCount: number };
  const breaker = getCircuitBreaker(tenant);
  const breakerKey = getBreakerKey(tenant);
  const now = Date.now();
  const previousState = breaker.state;

  // Circuit breaker logic
  if (breaker.state === 'OPEN') {
    if (now - breaker.lastOpened > COOLDOWN_MS) {
      const oldState = breaker.state;
      breaker.state = 'HALF_OPEN';
      recordStateTransition(breakerKey, oldState, 'HALF_OPEN', 'cooldown expired');
    } else {
      recordAttempt(breaker, false, 'circuit open');
      const responseTime = Date.now() - startTime;
      metricsService.recordRequest(breakerKey, false, responseTime, 0);
      return {
        success: false,
        transactionId: 'N/A',
        message: 'Circuit breaker is open. Please try again later.'
      };
    }
  }

  let testRequest = breaker.state === 'HALF_OPEN';

  switch (tenant.preferredProcessor) {
    case 'stripe': {
      const stripeKey = decrypt(tenant.encryptedStripeKey!);
      result = await retryWithBackoff(() => simulateStripe(stripeKey, amount, currency, source, tenant));
      break;
    }
    case 'paypal': {
      const clientId = decrypt(tenant.encryptedPaypalClientId!);
      const secret = decrypt(tenant.encryptedPaypalSecret!);
      result = await retryWithBackoff(() => simulatePayPal(clientId, secret, amount, currency, tenant));
      break;
    }
    case 'fake':
    default:
      const fakeResult = await simulateFakePay(amount, currency, tenant);
      result = { ...fakeResult, retryCount: 0 }; // Fake payments don't retry
      break;
  }

  const responseTime = Date.now() - startTime;
  metricsService.recordRequest(breakerKey, result.success, responseTime, result.retryCount);

  // Update circuit breaker state
  if (result.success) {
    breaker.failures = 0;
    if (breaker.state !== 'CLOSED') {
      const oldState = breaker.state;
      breaker.state = 'CLOSED';
      recordStateTransition(breakerKey, oldState, 'CLOSED', 'successful request');
    }
    getCircuitBreakerSummary(tenant).then(({ summary }) => {
        lastSummaries[breakerKey] = summary;
      });
    recordAttempt(breaker, true);
  } else {
    breaker.failures++;
    recordAttempt(breaker, false, 'provider failure');
    if (testRequest) {
      // If half-open and failed, reopen
      const oldState = breaker.state;
      breaker.state = 'OPEN';
      breaker.lastOpened = now;
      recordStateTransition(breakerKey, oldState, 'OPEN', 'half-open test failed');
      // Trigger summary
      getCircuitBreakerSummary(tenant).then(({ summary }) => {
        lastSummaries[breakerKey] = summary;
      });
    } else if (breaker.failures >= FAILURE_THRESHOLD) {
      const oldState = breaker.state;
      breaker.state = 'OPEN';
      breaker.lastOpened = now;
      recordStateTransition(breakerKey, oldState, 'OPEN', 'failure threshold exceeded');
      // Trigger summary
      getCircuitBreakerSummary(tenant).then(({ summary }) => {
        lastSummaries[breakerKey] = summary;
      });
    }
  }

  if (!result.success) {
    logTransaction({
      tenantId: tenant.tenantId,
      amount,
      currency,
      source: source || '',
      timestamp: new Date().toISOString(),
      transactionId: result.transactionId || 'N/A',
      success: false,
      message: result.message || 'Payment failed after retries',
    });
  }
  return result;
}

// Simulate Stripe payment
function simulateStripe(
  apiKey: string,
  amount: number,
  currency: string,
  source: string,
  tenant: TenantConfig
) {
  const transactionId = `stripe_txn_${Date.now()}`;
  const isSuccess = Math.random() > 0.5; // Make it flakier for demo
  const result = {
    success: isSuccess,
    transactionId,
    message: isSuccess ? 'Stripe payment success' : 'Stripe payment failed',
  };
  if (isSuccess) {
    logTransaction({
      tenantId: tenant.tenantId,
      amount,
      currency,
      source,
      timestamp: new Date().toISOString(),
      transactionId,
      success: isSuccess,
      message: result.message,
    });
  }
  return Promise.resolve(result);
}

// Simulate PayPal payment
function simulatePayPal(
  clientId: string,
  secret: string,
  amount: number,
  currency: string,
  tenant: TenantConfig
) {
  const transactionId = `paypal_txn_${Date.now()}`;
  const isSuccess = Math.random() > 0.5; // Make it flakier for demo
  console.log('isSuccess====', isSuccess);
  const result = {
    success: isSuccess,
    transactionId,
    message: isSuccess ? 'PayPal payment success' : 'PayPal payment failed',
  };
  if (isSuccess) {
    logTransaction({
      tenantId: tenant.tenantId,
      amount,
      currency,
      source: '',
      timestamp: new Date().toISOString(),
      transactionId,
      success: isSuccess,
      message: result.message,
    });
  }
  console.log('result====', result);
  return Promise.resolve(result);
}

// Simulate FakePay
function simulateFakePay(amount: number, currency: string, tenant: TenantConfig) {
  const transactionId = `fake_txn_${Date.now()}`;
  const result = {
    success: true,
    transactionId,
    message: 'Fake payment always succeeds',
  };
  logTransaction({
    tenantId: tenant.tenantId,
    amount,
    currency,
    source: '',
    timestamp: new Date().toISOString(),
    transactionId,
    success: true,
    message: result.message,
  });
  return Promise.resolve(result);
}
