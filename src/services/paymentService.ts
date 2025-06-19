// src/services/paymentService.ts

import { TenantConfig } from '../data/tenantStore';
import { decrypt } from '../utils/cryptoHelper';
import { logTransaction } from '../logs/transactionLogger';

export async function processPayment(
  tenant: TenantConfig,
  amount: number,
  currency: string,
  source: string
): Promise<{ success: boolean; transactionId: string; message: string }> {
    console.log('SHAN tenant====', tenant);
  switch (tenant.preferredProcessor) {
    case 'stripe': {
      // Decrypt stripe key
      const stripeKey = decrypt(tenant.encryptedStripeKey!);
      return simulateStripe(stripeKey, amount, currency, source, tenant);
    }

    case 'paypal': {
      // Decrypt PayPal credentials
      const clientId = decrypt(tenant.encryptedPaypalClientId!);
      const secret = decrypt(tenant.encryptedPaypalSecret!);
      return simulatePayPal(clientId, secret, amount, currency, tenant);
    }

    case 'fake':
    default:
      return simulateFakePay(amount, currency, tenant);
  }
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
  const isSuccess = Math.random() > 0.05;
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
  const isSuccess = Math.random() > 0.2;
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
