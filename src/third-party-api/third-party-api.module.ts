import { Module } from '@nestjs/common';

import { QuickNodeWebhookController } from './quicknode-webhook.controller';

@Module({
  controllers: [QuickNodeWebhookController],
  providers: [],
})
export class ThirdPartyApiModule {}
