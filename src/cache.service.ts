import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(configService: ConfigService) {
    this.redisClient = new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    });
  }

  onModuleInit() {
    this.redisClient.on('connect', () => console.log('Connected to Redis'));
    this.redisClient.on('error', (error) =>
      console.error('Redis error', error),
    );
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  async set(key: string, value: any, expirationSec: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', expirationSec);
  }

  async get(key: string): Promise<any> {
    const data = await this.redisClient.get(key);
    return JSON.parse(data);
  }

  async removeAllByPattern(pattern: string): Promise<void> {
    const MAX_COUNT = 1e5;
    const stream = this.redisClient.scanStream({
      match: pattern,
      count: MAX_COUNT,
    });
    const pipeline = this.redisClient.pipeline();

    for await (const keys of stream) {
      if (keys.length) {
        keys.forEach((key: string) => {
          pipeline.del(key);
        });

        await pipeline.exec();
      }
    }
  }
}
