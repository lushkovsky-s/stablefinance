import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Response,
  Query,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { JwtService } from '@nestjs/jwt';

import { SignatureVerificationService } from './signature-verification.service';
import { Auth0Service } from './auth0.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from './users.service';
import { JwtPayload } from './jwt.strategy';

interface UserRequest extends Request, JwtPayload {}

@Throttle({})
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private signatureVerification: SignatureVerificationService,
    private auth0: Auth0Service,
    private usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiOperation({
    summary: 'Get phrase to sign',
    description:
      'Get phras to be signed with private key (in local wallet), as so compliting the 1st authotization step',
  })
  @Get('phrase')
  async getPhrase(@Query('walletAddress') walletAddress: string): Promise<any> {
    if (!ethers.isAddress(walletAddress)) {
      throw new HttpException('Invalid wallet address', HttpStatus.BAD_REQUEST);
    }
    const phrase = this.signatureVerification.generatePhraseForWallet({
      walletAddress,
    });
    return { phrase };
  }

  @ApiOperation({
    summary: 'Verify signature and signup',
    description:
      '2nd step in wallet signing, verified the signed phrase and adds user',
  })
  @Post('verify')
  async verifyAndSignUp(
    @Request() req: Request,
    @Response() resp: Response,
    @Body('walletAddress') walletAddress: string,
    @Body('signature') signature: string,
  ): Promise<any> {
    if (!ethers.isAddress(walletAddress)) {
      throw new HttpException('Invalid wallet address', HttpStatus.BAD_REQUEST);
    }

    const valid = this.signatureVerification.verifySignature({
      walletAddress,
      signature,
    });

    const [authType, token] = (req.headers?.['Authorization'] || ' ').split('');

    if (authType && authType !== 'Bearer') {
      throw new HttpException(
        `Unsupported authorization: ${authType}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let jwtUserId = undefined;

    try {
      const decoded = await this.jwtService.verify(token);
      jwtUserId = decoded?.userId;
    } catch (err) {
      throw new HttpException('Misformed auth token', HttpStatus.BAD_REQUEST);
    }

    if (valid) {
      const jwt = this.auth0.loginWithWallet({ walletAddress, jwtUserId });
      resp.headers['Authorization'] = `Bearer ${jwt}`;
    } else {
      throw new UnauthorizedException();
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete user',
  })
  @Delete('user')
  async deleteUser(@Request() req: UserRequest): Promise<any> {
    this.usersService.deleteUser({ jwtUserId: req.userId });
  }
}
