/**
 * Upload Token Utilities
 * 
 * Shared module for generating and verifying HMAC-signed upload tokens.
 * Tokens prevent exposing the raw API key in the client-side bundle.
 * 
 * Token format: {expiresAt}:{nonce}.{hmac_signature}
 * - expiresAt: Unix timestamp (ms) when token expires
 * - nonce: 16 random hex bytes for uniqueness
 * - hmac_signature: SHA-256 HMAC of payload signed with API_UPLOAD_KEY
 */

import crypto from 'crypto';

const API_KEY = process.env.API_UPLOAD_KEY;
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a signed upload token
 */
export function generateUploadToken(): { token: string; expiresAt: number } {
    if (!API_KEY) {
        throw new Error('API_UPLOAD_KEY not configured');
    }

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${expiresAt}:${nonce}`;

    const hmac = crypto.createHmac('sha256', API_KEY);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    // Token format: payload.signature
    const token = `${payload}.${signature}`;

    return { token, expiresAt };
}

/**
 * Verify an upload token's validity
 */
export function verifyUploadToken(token: string): boolean {
    if (!API_KEY || !token) return false;

    try {
        const lastDotIndex = token.lastIndexOf('.');
        if (lastDotIndex === -1) return false;

        const payload = token.substring(0, lastDotIndex);
        const signature = token.substring(lastDotIndex + 1);

        // Verify HMAC
        const hmac = crypto.createHmac('sha256', API_KEY);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');

        // Timing-safe comparison
        if (signature.length !== expectedSignature.length) return false;
        const sigBuffer = Buffer.from(signature, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

        // Check expiry
        const [expiresAtStr] = payload.split(':');
        const expiresAt = parseInt(expiresAtStr, 10);
        if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

        return true;
    } catch {
        return false;
    }
}
