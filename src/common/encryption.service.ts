import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('ENCRYPTION_SECRET_KEY');
    if (!secretKey || secretKey.length !== 32) {
      throw new Error('ENCRYPTION_SECRET_KEY must be a 32-character string.');
    }
    // Key must be 32 bytes for aes-256-cbc
    this.key = Buffer.from(secretKey, 'utf8'); 
    // IV must be 16 bytes
    this.iv = Buffer.alloc(16, 0); // Using a static IV for simplicity, but a dynamic, stored IV is better for ultra-high security
  }

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}