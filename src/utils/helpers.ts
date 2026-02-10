/**
 * Utility Helper Functions
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new UUID v4
 */
export function generateSessionId(): string {
    return uuidv4();
}

/**
 * Get the device platform from user agent
 */
export function getDevicePlatform(): string {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('android')) return 'android';
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';

    return 'unknown';
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default 1000)
 * @param maxDelay - Maximum delay in milliseconds (default 30000)
 */
export function getBackoffDelay(
    attempt: number,
    baseDelay = 1000,
    maxDelay = 30000
): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

/**
 * Get current timestamp in ISO format
 */
export function getISOTimestamp(): string {
    return new Date().toISOString();
}
