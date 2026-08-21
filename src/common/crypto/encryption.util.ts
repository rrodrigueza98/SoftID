import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface Encrypted {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits, tamano recomendado para GCM

export function encryptBuffer(plain: Buffer, key: Buffer): Encrypted {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptBuffer(enc: Encrypted, key: Buffer): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, enc.iv);
  decipher.setAuthTag(enc.authTag);
  return Buffer.concat([decipher.update(enc.ciphertext), decipher.final()]);
}

export function encryptText(plain: string, key: Buffer): Encrypted {
  return encryptBuffer(Buffer.from(plain, 'utf8'), key);
}

export function decryptText(enc: Encrypted, key: Buffer): string {
  return decryptBuffer(enc, key).toString('utf8');
}

// ENCRYPTION_KEY se guarda en .env como hex de 32 bytes (64 caracteres) --
// mismo formato que se sugiere generar para JWT_SECRET, pero de largo fijo
// porque AES-256 exige exactamente 32 bytes de key.
export function parseEncryptionKey(hex: string): Buffer {
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser un hex de 32 bytes (64 caracteres) para AES-256-GCM');
  }
  return key;
}
