import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async check() {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Check database
    try {
      await this.dataSource.query('SELECT 1');
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'unhealthy';
    }

    // Redis check will be added when we implement caching
    health.redis = 'not_configured';

    // NBP API check will be added when we implement NBP integration
    health.nbp_api = 'not_configured';

    return health;
  }
}
