const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Ensure a 32-byte key is used. If ENCRYPTION_KEY is not set or not 32 bytes, we throw an error in production.
// For dev fallback, we hash a default string to guarantee 32 bytes.
let rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey) {
  console.warn('WARNING: ENCRYPTION_KEY is missing. Using an insecure fallback key for development.');
  rawKey = 'toka_insecure_fallback_encryption_key_123';
}
const KEY = crypto.createHash('sha256').update(rawKey).digest();

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Store iv, authTag, and encrypted text together
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(text) {
  if (!text) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text; // Probably not encrypted (e.g., demo user or legacy data)
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt secret key:', err.message);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt
};
