import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2025-01-22T10:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        database: { type: 'string', example: 'connected' },
        redis: { type: 'string', example: 'connected' },
        nbp_api: { type: 'string', example: 'available' },
      },
    },
  })
  async check() {
    return this.healthService.check();
  }
}
