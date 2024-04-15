import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';

import { CacheService } from 'src/cache.service';

@Injectable()
export class SignatureVerificationService {
  private PHRASES_EXPIRATION_SEC = 60 * 60; // 1hr

  constructor(private cacheService: CacheService) {}

  private genCacheKeyForWallet(walletAddress: string): string {
    return `wallet-auth::phrase::${walletAddress}`;
  }

  private genPhraseWithNonce(nonce: string): string {
    return `I would like to approve my authorization in Stable Finance: ${nonce}`;
  }

  async generatePhraseForWallet({
    walletAddress,
  }: {
    walletAddress: string;
  }): Promise<string> {
    const nonce = randomBytes(16).toString('hex');
    const phrase = this.genPhraseWithNonce(nonce);

    await this.cacheService.set(
      this.genCacheKeyForWallet(walletAddress),
      phrase,
      this.PHRASES_EXPIRATION_SEC,
    );

    return phrase;
  }

  async verifySignature({
    walletAddress,
    signature,
  }: {
    walletAddress: string;
    signature: string;
  }): Promise<any> {
    if (!ethers.isAddress(walletAddress)) {
      throw new Error('Invalid wallet address format.');
    }

    const phrase = await this.cacheService.get(
      this.genCacheKeyForWallet(walletAddress),
    );

    const signerAddress = ethers.verifyMessage(phrase, signature);

    return signerAddress.toLowerCase() === walletAddress.toLowerCase();
  }
}
