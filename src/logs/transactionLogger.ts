// src/logs/transactionLogger.ts

interface TransactionLog {
    tenantId: string;
    amount: number;
    currency: string;
    source: string;
    timestamp: string;
    transactionId: string;
    success: boolean;
    message: string;
  }
  
  const logs: TransactionLog[] = [];
  
  export function logTransaction(entry: TransactionLog) {
    console.log("YES HERE===", entry)
    logs.push(entry);
    console.log(`[${entry.timestamp}] ${entry.tenantId}: ${entry.message}`);
    console.log(`LOG SIZE: ${logs.length}`); 
  }
  
  export function getTransactionsForTenant(tenantId: string): TransactionLog[] {
    return logs.filter(log => log.tenantId === tenantId);
  }
  
  