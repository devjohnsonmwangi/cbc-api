import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  // Use the stronger AES-256-CBC algorithm
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  
  // For AES-256-CBC, the Initialization Vector (IV) must be 16 bytes.
  private readonly iv: Buffer;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('ENCRYPTION_SECRET_KEY');
    
    // NEW, CLEARER VALIDATION
    if (!secretKey || secretKey.length !== 32) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_SECRET_KEY is missing or is not exactly 32 characters long. Please check your .env file.');
    }
    
    // The key must be 32 bytes (32 characters) for aes-256-cbc
    this.key = Buffer.from(secretKey, 'utf8'); 
    
    // The IV must be 16 bytes (16 characters). We can derive this from the first 16 chars of the main key.
    const ivKey = this.configService.get<string>('ENCRYPTION_IV_KEY');
    if (!ivKey || ivKey.length !== 16) {
        throw new Error('FATAL SECURITY ERROR: ENCRYPTION_IV_KEY is missing or is not exactly 16 characters long. Please check your .env file.');
    }
    this.iv = Buffer.from(ivKey, 'utf8');
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