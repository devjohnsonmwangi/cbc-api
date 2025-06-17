// src/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
let _encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_encryptionKey) return _encryptionKey;
  const keyHexOrBase64 = process.env.CHAT_ENCRYPTION_KEY;
  if (!keyHexOrBase64) {
    throw new Error('FATAL: CHAT_ENCRYPTION_KEY environment variable is not set.');
  }
  try {
    const keyBuffer = keyHexOrBase64.length === 64 && /^[0-9a-fA-F]+$/.test(keyHexOrBase64)
      ? Buffer.from(keyHexOrBase64, 'hex') : Buffer.from(keyHexOrBase64, 'base64');
    if (keyBuffer.length !== 32) throw new Error(`Invalid encryption key length. Must be 32 bytes, got ${keyBuffer.length}.`);
    _encryptionKey = keyBuffer;
    return _encryptionKey;
  } catch (error: any) { throw new Error(`Failed to decode CHAT_ENCRYPTION_KEY: ${error.message}`); }
}

export const encryptText = (text: string): string => {
  if (typeof text !== 'string') throw new Error(`Cannot encrypt a non-string value. Received type: ${typeof text}`);
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encryptedBuffer.toString('hex')}`;
  } catch (error) { console.error('Encryption process failed:', error); throw new Error('Message encryption failed.'); }
};

export const decryptText = (data: any): string => {
  if (typeof data !== 'string') {
    if (data !== null && typeof data !== 'undefined') {
      console.warn(`[Encryption Shield] decryptText received non-string data (type: ${typeof data}). Preventing crash by returning an empty string.`);
    }
    return ""; // This is the shield. It handles Date, null, undefined, etc., and prevents crashes.
  }
  if (!data.includes(':')) return data; // Legacy plaintext
  const parts = data.split(':');
  if (parts.length !== 3) { console.warn(`[Encryption Shield] Decryption failed: Invalid format.`); return '[Invalid Message]'; }
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    if (!ivHex || !authTagHex || !encryptedDataHex) throw new Error('Invalid encrypted component.');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedDataHex, 'hex'), decipher.final()]).toString('utf8');
  } catch (error: any) { console.error(`[Encryption Shield] Decryption failed. Error: ${error.message}`); return '[Decryption Error]'; }
};

export const generatePreview = (text: string, maxLength: number = 75): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};
/**
 * A developer utility to generate a new, secure encryption key.
 */
export const generateAndLogNewKey = (): void => {
  const newKey = crypto.randomBytes(32);
  console.log('\n--- GENERATED ENCRYPTION KEY ---');
  console.log('Store one of these securely in your CHAT_ENCRYPTION_KEY environment variable:');
  console.log('\nHEX format (64 characters):');
  console.log(newKey.toString('hex'));
  console.log('\nBase64 format:');
  console.log(newKey.toString('base64'));
  console.log('\n---------------------------------\n');
};

/**
 * A helper function to run the key generator from the command line.
 */
function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--generate-key') || args.includes('generate-key')) {
    generateAndLogNewKey();
  } else if (require.main === module && args.length > 0) {
    console.log("To generate a new encryption key, run with the --generate-key argument:");
    console.log("Example: npx ts-node src/utils/encryption.ts --generate-key");
  }
}

// This check ensures the CLI part only runs when the file is executed directly.
if (require.main === module) {
  runCli();
}