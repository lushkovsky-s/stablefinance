import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {
  private DELETE_USER_DATA_REMOVAL_TIMEOUT_MS = 24 * 60 * 60 * 1000 * 30; // 30 days

  constructor(private prismaService: PrismaService) {}

  async deleteUser({ jwtUserId }: { jwtUserId: string }): Promise<void> {
    await this.prismaService.user.updateOne({
      where: { jwtUserId: jwtUserId },
      data: { deleted: true, deletedAt: new Date() },
    });
    setTimeout(async () => {
      // TODO: It's a dummy, make pesistent
      await this.prismaService.user.delete({
        where: { jwtId: jwtUserId },
      });
    }, this.DELETE_USER_DATA_REMOVAL_TIMEOUT_MS);
  }

  async createNewUser({
    walletAddress,
    jwtUserId,
  }: {
    walletAddress: string;
    jwtUserId: string;
  }) {
    const user = await this.prismaService.user.create({
      data: { jwtUserId },
    });
    await this.prismaService.wallet.create({
      data: { address: walletAddress, user: { connect: { id: user.id } } },
    });
  }

  async mergeAuth({
    walletAddress,
    jwtUserId,
  }: {
    walletAddress: string;
    jwtUserId: string;
  }) {
    const userByJwt = await this.prismaService.user.findOne({
      where: { jwtUserId },
    });
    const userByWallet = await this.prismaService.user.findOne({
      where: { jwtUserId: walletAddress },
    });

    await this.prismaService.wallet.update({
      where: { userId: userByWallet.id },
      date: {
        user: {
          connect: { id: userByJwt.id },
        },
      },
    });

    await this.prismaService.user.delete({ where: { id: userByWallet.id } });
  }
}
