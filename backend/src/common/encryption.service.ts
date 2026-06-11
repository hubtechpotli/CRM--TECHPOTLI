import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.get<string>('ENCRYPTION_KEY') || '';
    this.key = Buffer.from(hex.slice(0, 64), 'hex');
  }

  private assertKeyReady(): void {
    if (this.key.length !== 32) {
      throw new BadRequestException(
        'Credential storage is not configured on this server. Set ENCRYPTION_KEY (64 hex characters) in the backend environment.',
      );
    }
  }

  encrypt(plaintext: string): string {
    this.assertKeyReady();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(payload: string): string {
    this.assertKeyReady();
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8');
  }

  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
