import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initialize, Unleash } from 'unleash-client';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private unleash: Unleash;
  public FLAG_GZIP_TRANSACTIONS_RESPONSE = 'GZIP_TRANSACTIONS_RESPONSE';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('UNLEASH_URL');
    const appName = this.configService.get<string>('UNLEASH_APP_NAME');
    const instanceId = this.configService.get<string>('UNLEASH_INSTANCE_ID');

    this.unleash = initialize({ url, appName, instanceId });

    this.unleash.on('error', console.error);
    this.unleash.on('ready', () => console.log('Unleash client is ready'));
  }

  isEnabled(featureToggleName: string): boolean {
    return this.unleash.isEnabled(featureToggleName);
  }
}
