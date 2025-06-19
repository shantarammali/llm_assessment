// src/utils/cryptoHelper.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// const SECRET_KEY = crypto.randomBytes(32); // For demo; in real apps, store in env var
// const IV = crypto.randomBytes(16);

// Use consistent keys for demo - in production, use environment variables
const SECRET_KEY = crypto.scryptSync('demo-secret', 'salt', 32);
const IV = crypto.scryptSync('demo-iv', 'salt', 16);

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${IV.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(data: string): string {
  const [ivHex, encryptedHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}
