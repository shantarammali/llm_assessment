import express, { Request, Response } from 'express';
import { metricsService } from '../services/metricsService';
import { persistenceService } from '../services/persistenceService';
import { circuitBreakers, lastSummaries } from '../services/paymentService';

const router = express.Router();

// GET /metrics - Get all circuit breaker metrics
router.get('/', async (req: Request, res: Response) => {
  try {
    const globalMetrics = metricsService.getGlobalMetrics();
    const circuitMetrics = metricsService.getAllCircuitMetrics();
    const retryMetrics = metricsService.getAllRetryMetrics();
    const persistenceInfo = await persistenceService.getStateInfo();

    res.json({
      timestamp: new Date().toISOString(),
      global: globalMetrics,
      circuits: circuitMetrics,
      retries: retryMetrics,
      persistence: persistenceInfo,
      activeCircuitBreakers: Object.keys(circuitBreakers).length,
      activeSummaries: Object.keys(lastSummaries).length,
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// GET /metrics/global - Get global metrics only
router.get('/global', (req: Request, res: Response) => {
  try {
    res.json({
      timestamp: new Date().toISOString(),
      ...metricsService.getGlobalMetrics(),
    });
  } catch (error) {
    console.error('Error getting global metrics:', error);
    res.status(500).json({ error: 'Failed to get global metrics' });
  }
});

// GET /metrics/circuits - Get all circuit-specific metrics
router.get('/circuits', (req: Request, res: Response) => {
  try {
    const circuitMetrics = metricsService.getAllCircuitMetrics();
    const retryMetrics = metricsService.getAllRetryMetrics();
    
    // Combine circuit and retry metrics
    const combinedMetrics = circuitMetrics.map(circuit => {
      const retry = retryMetrics.find(r => r.breakerKey === circuit.breakerKey);
      return {
        ...circuit,
        retryMetrics: retry || null,
      };
    });

    res.json({
      timestamp: new Date().toISOString(),
      circuits: combinedMetrics,
    });
  } catch (error) {
    console.error('Error getting circuit metrics:', error);
    res.status(500).json({ error: 'Failed to get circuit metrics' });
  }
});

// GET /metrics/circuits/:breakerKey - Get metrics for specific circuit breaker
router.get('/circuits/:breakerKey', (req: Request, res: Response) => {
  try {
    const { breakerKey } = req.params;
    const circuitMetric = metricsService.getCircuitMetrics(breakerKey);
    const retryMetric = metricsService.getRetryMetrics(breakerKey);

    if (!circuitMetric) {
      res.status(404).json({ error: 'Circuit breaker not found' });
      return;
    }

    res.json({
      timestamp: new Date().toISOString(),
      circuit: {
        ...circuitMetric,
        retryMetrics: retryMetric,
      },
    });
  } catch (error) {
    console.error('Error getting circuit metrics:', error);
    res.status(500).json({ error: 'Failed to get circuit metrics' });
  }
});

// GET /metrics/retries - Get retry metrics only
router.get('/retries', (req: Request, res: Response) => {
  try {
    res.json({
      timestamp: new Date().toISOString(),
      retries: metricsService.getAllRetryMetrics(),
    });
  } catch (error) {
    console.error('Error getting retry metrics:', error);
    res.status(500).json({ error: 'Failed to get retry metrics' });
  }
});

// GET /metrics/persistence - Get persistence information
router.get('/persistence', async (req: Request, res: Response) => {
  try {
    const persistenceInfo = await persistenceService.getStateInfo();
    res.json({
      timestamp: new Date().toISOString(),
      persistence: persistenceInfo,
    });
  } catch (error) {
    console.error('Error getting persistence info:', error);
    res.status(500).json({ error: 'Failed to get persistence info' });
  }
});

// POST /metrics/reset - Reset all metrics
router.post('/reset', (req: Request, res: Response) => {
  try {
    const { breakerKey } = req.body;
    metricsService.resetMetrics(breakerKey);
    
    res.json({
      timestamp: new Date().toISOString(),
      message: breakerKey ? `Metrics reset for ${breakerKey}` : 'All metrics reset',
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

// GET /metrics/health - Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  try {
    const globalMetrics = metricsService.getGlobalMetrics();
    const circuitCount = metricsService.getAllCircuitMetrics().length;
    
    res.json({
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: {
        totalRequests: globalMetrics.totalRequests,
        failureRate: globalMetrics.globalFailureRate,
        activeCircuits: circuitCount,
      },
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router; 