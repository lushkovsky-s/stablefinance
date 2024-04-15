import { Controller, Get, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { QuickAlertWebhookItem } from './quicknode-webhook-item.dto';
import { ThirdPartyApiService } from './third-party-api.service';

@Throttle({})
@ApiTags('External API webhook :: QuickNode API')
@Controller('external-wh')
export class QuickNodeWebhookController {
  constructor(private thirdPartyApiService: ThirdPartyApiService) {}

  @ApiOperation({
    summary: 'QuickAlert webhook endpoint',
    description:
      'Endpoint to receive web3 updates from QuickAlert API (by QuickNode). Should be pre-configured.',
  })
  @Get('quick-alert')
  async getTransactions(@Body() items: QuickAlertWebhookItem[]) {
    items.map(async (item) => {
      const ifTo = await this.thirdPartyApiService.ifWalletExistsInDb({
        walletAddress: item.to,
      });
      const ifFrom = await this.thirdPartyApiService.ifWalletExistsInDb({
        walletAddress: item.from,
      });

      if (ifTo || ifFrom) {
        await this.thirdPartyApiService.registerNewTransaction({
          walletAddress: ifTo ? item.to : item.from,
          to: item.to,
          from: item.from,
          value: parseInt(item.value, 16),
          hash: item.hash,
        });
      }
    });
  }
}
