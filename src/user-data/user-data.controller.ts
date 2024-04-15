import { Controller, Get, Req, Res, Query, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { FeatureFlagsService } from '../feature-flags.service';
import * as zlib from 'zlib';
import { Throttle } from '@nestjs/throttler';
import { UserDataService } from './user-data.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PaginationQueryDto } from './pagination-query.dto';
import { JwtPayload } from 'src/auth/jwt.strategy';

interface UserRequest extends Request, JwtPayload {}

@Throttle({})
@ApiTags('User data')
@Controller('user-data')
export class UserDataController {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly userDataService: UserDataService,
  ) {}

  @ApiOperation({
    summary: 'Get transaction (paginated)',
    description: 'Get all user transactions (paginated)',
  })
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @Req() request: UserRequest,
    @Res() response: Response,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const data = this.userDataService.getUserTransactions({
      userId: request.userId,
      page: paginationQuery.page,
      limit: paginationQuery.limit,
    });
    const acceptEncoding = request.headers['accept-encoding'] || '';

    if (
      this.featureFlagsService.isEnabled(
        this.featureFlagsService.FLAG_GZIP_TRANSACTIONS_RESPONSE,
      ) &&
      acceptEncoding.includes('gzip')
    ) {
      zlib.gzip(JSON.stringify(data), (err, buffer) => {
        if (err) {
          response.status(500).send('Compression error');
          return;
        }
        response.setHeader('Content-Encoding', 'gzip');
        response.send(buffer);
      });
    } else {
      response.json(data);
    }
  }

  @ApiOperation({
    summary: 'Get tokens (paginated)',
    description: 'Get all user tokens (paginated)',
  })
  @Get('tokens')
  @UseGuards(JwtAuthGuard)
  async getTokens(
    @Req() request: UserRequest,
    @Res() response: Response,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const data = this.userDataService.getUserTokens({
      userId: request.userId,
      page: paginationQuery.page,
      limit: paginationQuery.limit,
      tokenTypes: ['stablecoin', 'cryptocurrency'],
    });

    return response.json(data);
  }

  @ApiOperation({
    summary: 'Get NFTs (paginated)',
    description: 'Get all user NFTs (paginated)',
  })
  @Get('nfts')
  @UseGuards(JwtAuthGuard)
  async getNfts(
    @Req() request: UserRequest,
    @Res() response: Response,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const data = this.userDataService.getUserTokens({
      userId: request.userId,
      page: paginationQuery.page,
      limit: paginationQuery.limit,
      tokenTypes: ['nft'],
    });

    return response.json(data);
  }
}
