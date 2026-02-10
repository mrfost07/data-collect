/**
 * IndexedDB Storage for Offline Upload Queue
 * 
 * Uses idb-keyval for simple key-value storage.
 * Stores failed uploads for retry when connection is restored.
 */

import { get, set, del, keys, clear } from 'idb-keyval';
import { CaptureItem } from '@/types';

const STORE_PREFIX = 'upload_queue_';

/**
 * Save a capture to IndexedDB for later retry
 */
export async function saveToOfflineQueue(capture: CaptureItem): Promise<void> {
    const key = `${STORE_PREFIX}${capture.id}`;
    await set(key, capture);
}

/**
 * Remove a capture from the offline queue (after successful upload)
 */
export async function removeFromOfflineQueue(captureId: string): Promise<void> {
    const key = `${STORE_PREFIX}${captureId}`;
    await del(key);
}

/**
 * Get all captures from the offline queue
 */
export async function getOfflineQueue(): Promise<CaptureItem[]> {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(
        (key) => typeof key === 'string' && key.startsWith(STORE_PREFIX)
    );

    const captures: CaptureItem[] = [];
    for (const key of queueKeys) {
        const capture = await get<CaptureItem>(key);
        if (capture) {
            captures.push(capture);
        }
    }

    return captures;
}

/**
 * Clear all items from the offline queue
 */
export async function clearOfflineQueue(): Promise<void> {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(
        (key) => typeof key === 'string' && key.startsWith(STORE_PREFIX)
    );

    for (const key of queueKeys) {
        await del(key);
    }
}

/**
 * Get the count of items in the offline queue
 */
export async function getOfflineQueueCount(): Promise<number> {
    const allKeys = await keys();
    return allKeys.filter(
        (key) => typeof key === 'string' && key.startsWith(STORE_PREFIX)
    ).length;
}
