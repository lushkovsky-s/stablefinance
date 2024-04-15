import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from './users.service';

@Injectable()
export class Auth0Service {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private usersService: UsersService,
  ) {}

  private async getManagementApiToken(): Promise<string> {
    const AUTH0_DOMAIN = this.configService.get<string>('AUTH0_DOMAIN');
    const AUTH0_CLIENT_ID = this.configService.get<string>('AUTH0_CLIENT_ID');
    const AUTH0_CLIENT_SECRET = this.configService.get<string>(
      'AUTH0_CLIENT_SECRET',
    );

    const { data } = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
    }); // TODO: catch

    return data.access_token;
  }

  async loginWithWallet({
    walletAddress,
    jwtUserId,
  }: {
    walletAddress: string;
    jwtUserId: string;
  }): Promise<void> {
    const walletInDb = this.prismaService.wallet.findOne({
      where: { address: walletAddress },
    });

    if (walletInDb) {
      if (jwtUserId === walletAddress) {
      } else {
        await this.usersService.mergeAuth({ walletAddress, jwtUserId });
      }
    } else {
      await this.addUserWithCryptoWallet({ walletAddress });
      return await this.usersService.createNewUser({
        walletAddress,
        jwtUserId,
      });
    }
  }

  async addUserWithCryptoWallet({
    walletAddress,
  }: {
    walletAddress: string;
  }): Promise<void> {
    const AUTH0_DOMAIN = this.configService.get<string>('AUTH0_DOMAIN');
    const AUTH0_CRYPTO_CONNECTION_NAME = this.configService.get<string>(
      'AUTH0_CRYPTO_CONNECTION_NAME',
    );

    const token = await this.getManagementApiToken();

    const userData = {
      connection: AUTH0_CRYPTO_CONNECTION_NAME,
      user_id: walletAddress,
      name: walletAddress,
      nickname: 'CryptoWalletUser',
      app_metadata: { walletAddress },
    };

    const userCreationResponse = await axios.post(
      `https://${AUTH0_DOMAIN}/api/v2/users`,
      userData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ); // TODO: catch

    const temporaryToken = userCreationResponse.data.temporaryTokenField;

    if (temporaryToken) {
      const jwtExchangeResponse = await axios.post(
        `https://${AUTH0_DOMAIN}/jwt/exchange`,
        { temporaryToken },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      return jwtExchangeResponse.data.accessToken;
    } else {
      console.warn('No temporary token found in user creation response');
      return null;
    }
  }
}
