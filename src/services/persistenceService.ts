import fs from 'fs/promises';
import path from 'path';

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastOpened: number;
  history: Array<{
    timestamp: number;
    success: boolean;
    reason?: string;
  }>;
}

export interface PersistenceData {
  circuitBreakers: Record<string, CircuitBreakerState>;
  lastSummaries: Record<string, string>;
  timestamp: number;
}

class PersistenceService {
  private readonly dataDir = path.join(__dirname, '../data');
  private readonly circuitBreakerFile = path.join(this.dataDir, 'circuit_breakers.json');
  private readonly backupFile = path.join(this.dataDir, 'circuit_breakers.backup.json');
  private saveInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load existing data
      await this.loadCircuitBreakerState();
      
      // Set up periodic saving - will be called from paymentService with actual data
      this.saveInterval = setInterval(() => {
        // This will be called with actual data from paymentService
        console.log('Periodic save triggered - will be handled by paymentService');
      }, 30000); // Save every 30 seconds
      
      this.isInitialized = true;
      console.log('Persistence service initialized');
    } catch (error) {
      console.error('Failed to initialize persistence service:', error);
    }
  }

  async saveCircuitBreakerState(
    circuitBreakers: Record<string, any>,
    lastSummaries: Record<string, string>
  ) {
    try {
      const data: PersistenceData = {
        circuitBreakers: {},
        lastSummaries,
        timestamp: Date.now(),
      };

      // Convert circuit breakers to serializable format
      for (const [key, breaker] of Object.entries(circuitBreakers)) {
        data.circuitBreakers[key] = {
          state: breaker.state,
          failures: breaker.failures,
          lastOpened: breaker.lastOpened,
          history: breaker.history || [],
        };
      }

      // Create backup first
      try {
        await fs.copyFile(this.circuitBreakerFile, this.backupFile);
      } catch (error) {
        // Backup file might not exist yet, that's okay
      }

      // Write new data
      await fs.writeFile(this.circuitBreakerFile, JSON.stringify(data, null, 2));
      
      console.log(`Circuit breaker state saved at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Failed to save circuit breaker state:', error);
      throw error;
    }
  }

  async loadCircuitBreakerState(): Promise<{
    circuitBreakers: Record<string, CircuitBreakerState>;
    lastSummaries: Record<string, string>;
  }> {
    try {
      const data = await fs.readFile(this.circuitBreakerFile, 'utf-8');
      const parsed: PersistenceData = JSON.parse(data);
      
      // Validate data structure
      if (!parsed.circuitBreakers || !parsed.lastSummaries) {
        throw new Error('Invalid data structure in circuit breaker file');
      }

      console.log(`Loaded circuit breaker state from ${new Date(parsed.timestamp).toISOString()}`);
      return {
        circuitBreakers: parsed.circuitBreakers,
        lastSummaries: parsed.lastSummaries,
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('No existing circuit breaker state found, starting fresh');
        return {
          circuitBreakers: {},
          lastSummaries: {},
        };
      }
      
      // Try to load from backup
      try {
        console.log('Attempting to load from backup file...');
        const backupData = await fs.readFile(this.backupFile, 'utf-8');
        const parsed: PersistenceData = JSON.parse(backupData);
        console.log('Successfully loaded from backup file');
        return {
          circuitBreakers: parsed.circuitBreakers,
          lastSummaries: parsed.lastSummaries,
        };
      } catch (backupError) {
        console.error('Failed to load from backup file:', backupError);
        return {
          circuitBreakers: {},
          lastSummaries: {},
        };
      }
    }
  }

  async cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    
    // Final save before shutdown
    try {
      // This will be called with current state from paymentService
      console.log('Persistence service cleanup completed');
    } catch (error) {
      console.error('Error during persistence service cleanup:', error);
    }
  }

  async getStateInfo() {
    try {
      const stats = await fs.stat(this.circuitBreakerFile);
      return {
        fileExists: true,
        fileSize: stats.size,
        lastModified: stats.mtime,
        backupExists: await this.backupExists(),
      };
    } catch (error) {
      return {
        fileExists: false,
        fileSize: 0,
        lastModified: null,
        backupExists: await this.backupExists(),
      };
    }
  }

  private async backupExists(): Promise<boolean> {
    try {
      await fs.access(this.backupFile);
      return true;
    } catch {
      return false;
    }
  }
}

export const persistenceService = new PersistenceService(); 