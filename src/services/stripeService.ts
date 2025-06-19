// src/services/stripeService.ts

export async function simulateStripePayment(
    stripeApiKey: string,
    amount: number,
    currency: string,
    source: string
  ): Promise<{ success: boolean; transactionId: string; message: string }> {
    // Simulate success/failure
    const isSuccess = Math.random() > 0.1; // 90% success rate
    const transactionId = `txn_${Math.random().toString(36).substring(2, 10)}`;
  
    return {
      success: isSuccess,
      transactionId,
      message: isSuccess ? 'Payment successful' : 'Payment failed',
    };
  }
  