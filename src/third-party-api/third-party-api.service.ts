import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';
import axios from 'axios';
import { CovalentClient } from '@covalenthq/client-sdk';
import { readFileSync } from 'jsonfile';

import { PrismaService } from 'src/prisma.service';
import { CacheService } from 'src/cache.service';

enum CovalentChain {
  EthSepolia = 'eth-sepolia',
  AvalanceFuji = 'avalanche-testnet',
  PolygonMumbai = 'matic-mumbai',
  ArbitrumSepolia = 'arbitrum-sepolia',
}
enum QuickAlertNotificationByChain {
  EthSepolia = 1,
  AvalanceFuji = 2,
  PolygonMumbai = 3,
  ArbitrumSepolia = 4,
}

@Injectable()
export class ThirdPartyApiService {
  private EVER_MAX_TRANSACTION_PAGES = 100;
  private covalentApiLimiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1000, // 1s
  });
  private quickNodeApiLimiter = new Bottleneck({
    maxConcurrent: 100,
    minTime: 100, // 100 ms
  });
  private quickNodeDestinations = {};

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private cacheService: CacheService,
  ) {
    const filePath = this.configService.get<string>(
      'QUICK_NODE_DESTINATIONS_CONFIG_FILEPATH',
    );
    try {
      this.quickNodeDestinations = readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(
        'Error reading QuickNode destinations configuration',
        error,
      );
    }
  }

  private formatQuickAlertExpression({
    listenAddresses,
  }: {
    listenAddresses: string[];
  }): string {
    return Buffer.from(
      listenAddresses
        .map((address) => `'tx_from'=='${address}' || 'tx_to'=='${address}'`)
        .join('||'),
    ).toString('base64');
  }

  private async updateQuickAlertNotification({
    notificationId,
    expression,
    destinationId,
  }: {
    notificationId: number;
    expression: string;
    destinationId: string;
  }) {
    const QUICK_NODE_API_KEY =
      this.configService.get<string>('QUICK_NODE_API_KEY');

    await axios({
      method: 'PATCH',
      url: `https://api.quicknode.com/quickalerts/rest/v1/notifications/${notificationId}`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': QUICK_NODE_API_KEY,
      },
      data: JSON.stringify({
        name: 'My Notification',
        expression: expression,
        destinationIds: [destinationId],
      }),
    });
  }

  private async updateWebhook() {}

  private async getTransactionsPageViaCovalentApi({
    walletAddress,
    chain,
    page,
  }: {
    walletAddress: string;
    chain: CovalentChain;
    page: number;
  }) {
    const COVALENT_API_KEY = this.configService.get<string>('COVALET_API_KEY');

    try {
      const response = await axios.get(
        `https://api.covalenthq.com/v1/${chain}/address/${walletAddress}/transactions_v3/page/${page}/?`,
        {
          headers: {
            Authorization: `Bearer ${COVALENT_API_KEY}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      // TODO: Handle error appropriately
      throw error;
    }
  }

  private async pullTransactionsViaCovalentApi({
    walletAddress,
    chain,
  }: {
    walletAddress: string;
    chain: CovalentChain;
  }) {
    for (let page = 0; page < this.EVER_MAX_TRANSACTION_PAGES; page++) {
      await this.covalentApiLimiter.schedule(async () => {
        const { items } = await this.getTransactionsPageViaCovalentApi({
          walletAddress,
          chain,
          page,
        });

        items
          .filter(
            (transItem) => transItem.success && !transItem.nft_sale_details,
          )
          .map(async (transItem) => {
            await this.prismaService.transaction.upsert({
              where: { hash: transItem.tx_hash },
              update: {},
              create: {
                wallet: {
                  connect: { address: walletAddress },
                },
                to: transItem.to_address,
                from: transItem.from_address,
                value: transItem.value,
                ts: transItem.block_signed_at,
              },
            });
          });
      });
    }
  }

  private async pullTokensViaCovalentApi({
    walletAddress,
    chain,
  }: {
    walletAddress: string;
    chain: CovalentChain;
  }) {
    const COVALENT_API_KEY = this.configService.get<string>('COVALET_API_KEY');
    const client = new CovalentClient(COVALENT_API_KEY);

    const resp = await this.covalentApiLimiter.schedule(
      async () =>
        await client.BalanceService.getTokenBalancesForWalletAddress(
          chain,
          walletAddress,
        ),
    );

    resp.data.items.map(async (contractItem) => {
      const contract = await this.prismaService.contract.upsert({
        where: { address: contractItem.contract_address },
        update: {},
        create: {
          wallet: {
            connect: { address: walletAddress },
          },
          name: contractItem.contract_display_name,
          decimals: contractItem.contract_decimals,
          ticker: contractItem.contract_ticker_symbol,
          ercType: contractItem.supports_erc[0], // TODO: Dangerous
          logo: contractItem.logo_url,
          type: contractItem.type,
          spam: contractItem.is_spam,
          meta: {
            ...contractItem.protocol_metadata,
            nftMeta: contractItem.nft_data,
          },
        },
      });

      await this.prismaService.walletPosession.upsert({
        where: { contractId: contract.id },
        update: {
          amount: contractItem.balance,
        },
        create: {
          wallet: {
            connect: { address: walletAddress },
          },
          contract: {
            connect: { id: contract.id },
          },
          amount: contractItem.balance,
        },
      });
    });
  }

  async pullWalletTokens({ walletAddress }: { walletAddress: string }) {
    for (const chainKey of Object.keys(CovalentChain)) {
      const chain = CovalentChain[chainKey as keyof typeof CovalentChain];
      await this.pullTransactionsViaCovalentApi({ walletAddress, chain });
      await this.pullTokensViaCovalentApi({ walletAddress, chain });
    }
  }

  async processNewWallet({ walletAddress }: { walletAddress: string }) {
    await this.pullWalletTokens({ walletAddress });

    const wallets = await this.prismaService.wallet.findMany();
    const expression = this.formatQuickAlertExpression(
      wallets.map((wallet) => wallet.address),
    );

    for (const chainKey of Object.keys(QuickAlertNotificationByChain)) {
      const notificationId =
        QuickAlertNotificationByChain[
          chainKey as keyof typeof QuickAlertNotificationByChain
        ];
      const destinationId = this.quickNodeDestinations[chainKey];
      this.quickNodeApiLimiter.schedule(() =>
        this.updateQuickAlertNotification({
          destinationId,
          expression,
          notificationId,
        }),
      );
    }
  }

  async ifWalletExistsInDb({
    walletAddress,
  }: {
    walletAddress: string;
  }): Promise<boolean> {
    return !!(await this.prismaService.wallet.findUnique({
      where: { address: walletAddress },
    }));
  }

  async registerNewTransaction({
    walletAddress,
    to,
    from,
    value,
    hash,
  }: {
    walletAddress: string;
    to: string;
    from: string;
    value: number;
    hash: string;
  }) {
    await this.prismaService.transaction.insertOne({
      data: {
        wallet: {
          connect: { address: walletAddress },
        },
        to,
        from,
        value,
        hash,
        ts: new Date(), // NOTE: Not accurate, but there is no datetime data in QuickAlert hook, options: 1) sort by block number 2) make extra request to check block time
      },
    });

    await this.pullWalletTokens({ walletAddress });

    const user = await this.prismaService.user.findOne({
      where: {
        wallet: {
          address: walletAddress,
        },
      },
      select: {
        include: {
          wallet: true,
        },
      },
    });

    await this.cacheService.removeAllByPattern(`user-data::${user.id}::*`);
  }
}
