export interface CircuitMetrics {
  breakerKey: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retryCount: number;
  circuitStateTransitions: CircuitStateTransition[];
  currentState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastStateChange: number;
  averageResponseTime: number;
  failureRate: number;
}

export interface CircuitStateTransition {
  from: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  to: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  timestamp: number;
  reason: string;
}

export interface RetryMetrics {
  breakerKey: string;
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetriesPerRequest: number;
}

class MetricsService {
  private metrics: Map<string, CircuitMetrics> = new Map();
  private retryMetrics: Map<string, RetryMetrics> = new Map();
  private globalMetrics = {
    totalRequests: 0,
    totalSuccessfulRequests: 0,
    totalFailedRequests: 0,
    totalRetries: 0,
    averageResponseTime: 0,
  };

  recordRequest(breakerKey: string, success: boolean, responseTime: number, retries: number = 0) {
    // Update global metrics
    this.globalMetrics.totalRequests++;
    this.globalMetrics.totalSuccessfulRequests += success ? 1 : 0;
    this.globalMetrics.totalFailedRequests += success ? 0 : 1;
    this.globalMetrics.totalRetries += retries;

    // Update circuit-specific metrics
    if (!this.metrics.has(breakerKey)) {
      this.metrics.set(breakerKey, {
        breakerKey,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        retryCount: 0,
        circuitStateTransitions: [],
        currentState: 'CLOSED',
        lastStateChange: Date.now(),
        averageResponseTime: 0,
        failureRate: 0,
      });
    }

    const circuitMetric = this.metrics.get(breakerKey)!;
    circuitMetric.totalRequests++;
    circuitMetric.successfulRequests += success ? 1 : 0;
    circuitMetric.failedRequests += success ? 0 : 1;
    circuitMetric.retryCount += retries;
    circuitMetric.failureRate = circuitMetric.failedRequests / circuitMetric.totalRequests;

    // Update average response time
    const currentAvg = circuitMetric.averageResponseTime;
    const newAvg = (currentAvg * (circuitMetric.totalRequests - 1) + responseTime) / circuitMetric.totalRequests;
    circuitMetric.averageResponseTime = newAvg;

    // Update retry metrics
    if (!this.retryMetrics.has(breakerKey)) {
      this.retryMetrics.set(breakerKey, {
        breakerKey,
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageRetriesPerRequest: 0,
      });
    }

    const retryMetric = this.retryMetrics.get(breakerKey)!;
    retryMetric.totalRetries += retries;
    retryMetric.successfulRetries += success && retries > 0 ? 1 : 0;
    retryMetric.failedRetries += !success && retries > 0 ? 1 : 0;
    retryMetric.averageRetriesPerRequest = retryMetric.totalRetries / circuitMetric.totalRequests;
  }

  recordStateTransition(breakerKey: string, from: 'CLOSED' | 'OPEN' | 'HALF_OPEN', to: 'CLOSED' | 'OPEN' | 'HALF_OPEN', reason: string) {
    if (!this.metrics.has(breakerKey)) {
      this.metrics.set(breakerKey, {
        breakerKey,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        retryCount: 0,
        circuitStateTransitions: [],
        currentState: 'CLOSED',
        lastStateChange: Date.now(),
        averageResponseTime: 0,
        failureRate: 0,
      });
    }

    const circuitMetric = this.metrics.get(breakerKey)!;
    circuitMetric.circuitStateTransitions.push({
      from,
      to,
      timestamp: Date.now(),
      reason,
    });
    circuitMetric.currentState = to;
    circuitMetric.lastStateChange = Date.now();

    // Keep only last 100 transitions
    if (circuitMetric.circuitStateTransitions.length > 100) {
      circuitMetric.circuitStateTransitions = circuitMetric.circuitStateTransitions.slice(-100);
    }
  }

  getCircuitMetrics(breakerKey: string): CircuitMetrics | null {
    return this.metrics.get(breakerKey) || null;
  }

  getAllCircuitMetrics(): CircuitMetrics[] {
    return Array.from(this.metrics.values());
  }

  getRetryMetrics(breakerKey: string): RetryMetrics | null {
    return this.retryMetrics.get(breakerKey) || null;
  }

  getAllRetryMetrics(): RetryMetrics[] {
    return Array.from(this.retryMetrics.values());
  }

  getGlobalMetrics() {
    return {
      ...this.globalMetrics,
      globalFailureRate: this.globalMetrics.totalRequests > 0 
        ? this.globalMetrics.totalFailedRequests / this.globalMetrics.totalRequests 
        : 0,
      averageRetriesPerRequest: this.globalMetrics.totalRequests > 0 
        ? this.globalMetrics.totalRetries / this.globalMetrics.totalRequests 
        : 0,
    };
  }

  resetMetrics(breakerKey?: string) {
    if (breakerKey) {
      this.metrics.delete(breakerKey);
      this.retryMetrics.delete(breakerKey);
    } else {
      this.metrics.clear();
      this.retryMetrics.clear();
      this.globalMetrics = {
        totalRequests: 0,
        totalSuccessfulRequests: 0,
        totalFailedRequests: 0,
        totalRetries: 0,
        averageResponseTime: 0,
      };
    }
  }
}

export const metricsService = new MetricsService(); 