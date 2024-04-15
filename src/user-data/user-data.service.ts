import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma.service';
import { CacheService } from 'src/cache.service';

@Injectable()
export class UserDataService {
  private USER_CACHE_EXPIRATION_SEC = 60 * 60 * 24 * 30; // 30 days

  constructor(
    private prismaService: PrismaService,
    private cacheService: CacheService,
  ) {}

  private async paginatedWithCache({
    cacheKey,
    page,
    limit,
    retrieveFromDb,
  }: {
    cacheKey: string;
    page: number;
    limit: number;
    retrieveFromDb: () => Promise<any[]>;
  }) {
    let data = await this.cacheService.get(cacheKey);

    if (!data) {
      data = await retrieveFromDb();

      await this.cacheService.set(
        cacheKey,
        data,
        this.USER_CACHE_EXPIRATION_SEC,
      );
    }

    return data.slice(page * limit, (page + 1) * limit);
  }

  async getUserTransactions({
    userId,
    page,
    limit,
  }: {
    userId: string;
    page: number;
    limit: number;
  }) {
    return this.paginatedWithCache({
      cacheKey: `user-data::${userId}::transactions`,
      page,
      limit,
      retrieveFromDb: async () => {
        const user = await this.prismaService.user.findUnique({
          where: { id: userId },
          select: {
            wallets: {
              select: {
                transactions: true,
              },
            },
          },
        });

        return user.wallets
          .map((wallet) => wallet.transactions)
          .sort((trans1, trans2) => trans1.ts - trans2.ts)
          .flat();
      },
    });
  }

  async getUserTokens({
    userId,
    page,
    limit,
    tokenTypes,
  }: {
    userId: string;
    page: number;
    limit: number;
    tokenTypes: ('nft' | 'dust' | 'stablecoin' | 'cryptocurrency')[];
  }) {
    return this.paginatedWithCache({
      cacheKey: `user-data::${userId}::tokens`,
      page,
      limit,
      retrieveFromDb: async () => {
        const user = await this.prismaService.user.findUnique({
          where: {
            id: userId,
            wallet: {
              contract: {
                type: {
                  in: tokenTypes,
                },
              },
            },
          },
          select: {
            wallets: {
              select: {
                contracts: true,
              },
            },
          },
        });

        return user.wallets.map((wallet) => wallet.contracts).flat();
      },
    });
  }
}
