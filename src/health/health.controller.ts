import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Kubernetes')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Kubernetes healthcheck',
    description:
      'If service will be down, this method will return error and k8s will restart the container',
  })
  async health(): Promise<string> {
    return 'OK';
  }
}
