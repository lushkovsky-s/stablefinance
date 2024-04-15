import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Kubernetes')
@Controller('ready')
export class ReadyController {
  @Get()
  @ApiOperation({
    summary: 'Kubernetes ready',
    description:
      'Using this method k8s will check if pod is open for new requests (boostraped or resumed after pause (if some custom logic implemented))',
  })
  async ready(): Promise<string> {
    return 'OK';
  }
}
