import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../identity/interface/http/decorators/public.decorator';
import { GetHealthUseCase } from '../../application/get-health.use-case';
import type { HealthReport } from '../../domain/health-report';

@ApiTags('health')
@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — process is up (no dependency checks)' })
  @ApiOkResponse({ description: 'Service is alive' })
  live(): HealthReport {
    return this.getHealth.live();
  }

  @Get('live')
  @ApiOperation({ summary: 'Alias of GET /health' })
  liveAlias(): HealthReport {
    return this.getHealth.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — probes database and other dependencies' })
  ready(): Promise<HealthReport> {
    return this.getHealth.ready();
  }
}
