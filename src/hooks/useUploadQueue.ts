'use client';

/**
 * Upload Queue Hook
 * 
 * Manages client-side upload queue with:
 * - Reliable queue processing with explicit re-triggering
 * - Progressive rate limit backoff (30s → 60s → 120s on consecutive 429s)
 * - 0.3s delay between successful uploads (Cloudinary has generous rate limits)
 * - Mounted ref to prevent state updates after unmount
 * - IndexedDB persistence for offline support
 * - Exponential backoff retry per item
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { CaptureItem, CaptureMetadata } from '@/types';
import {
    saveToOfflineQueue,
    removeFromOfflineQueue,
    getOfflineQueue,
} from '@/lib/indexed-db';
import { getBackoffDelay, generateSessionId } from '@/utils/helpers';

const MAX_RETRIES = 5;
const DELAY_BETWEEN_UPLOADS_MS = 300; // 0.3s between successful uploads (Cloudinary has generous limits)

export function useUploadQueue(apiKey: string) {
    const [queue, setQueue] = useState<CaptureItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);

    // Refs for reliable queue management
    const mountedRef = useRef(true);
    const processingRef = useRef(false); // true when processQueue is actively running
    const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queueRef = useRef<CaptureItem[]>([]); // mirror of queue state for use in async callbacks
    const consecutiveRateLimitsRef = useRef(0); // tracks how many 429s in a row

    // Keep queueRef in sync with state
    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
        };
    }, []);

    /**
     * Calculate upload progress statistics
     */
    const uploadProgress = {
        success: queue.filter((item) => item.status === 'success').length,
        failed: queue.filter((item) => item.status === 'error' && item.retryCount >= MAX_RETRIES).length,
        pending: queue.filter(
            (item) => item.status === 'pending' || item.status === 'uploading'
        ).length,
    };

    /**
     * Upload a single item to the server
     */
    const uploadItem = useCallback(
        async (item: CaptureItem): Promise<'success' | 'error' | 'rate_limit'> => {
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                    },
                    body: JSON.stringify({
                        imageBase64: item.imageBase64,
                        metadata: item.metadata,
                    }),
                });

                if (response.status === 429) {
                    return 'rate_limit';
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Upload failed:', response.status, errorData);
                    return 'error';
                }

                const data = await response.json();
                return data.success === true ? 'success' : 'error';
            } catch (err) {
                console.error('Upload error:', err);
                return 'error';
            }
        },
        [apiKey]
    );

    /**
     * Process one item from the queue, then schedule the next
     */
    const processNext = useCallback(async () => {
        if (!mountedRef.current) return;

        // Find the next pending item from the ref (always fresh)
        const currentQueue = queueRef.current;
        const nextItem = currentQueue.find(
            (item) =>
                (item.status === 'pending') &&
                item.retryCount < MAX_RETRIES
        );

        if (!nextItem) {
            // Nothing left to process
            processingRef.current = false;
            if (mountedRef.current) {
                setIsUploading(false);
            }
            return;
        }

        if (!mountedRef.current) return;
        setIsUploading(true);

        // Mark as uploading
        setQueue((prev) =>
            prev.map((q) => (q.id === nextItem.id ? { ...q, status: 'uploading' as const } : q))
        );

        // Apply per-item backoff delay if retrying
        if (nextItem.retryCount > 0) {
            const delay = getBackoffDelay(nextItem.retryCount);
            await new Promise((resolve) => setTimeout(resolve, delay));
            if (!mountedRef.current) return;
        }

        const result = await uploadItem(nextItem);
        if (!mountedRef.current) return;

        if (result === 'success') {
            // Reset consecutive rate limit counter on success
            consecutiveRateLimitsRef.current = 0;

            setQueue((prev) =>
                prev.map((q) => (q.id === nextItem.id ? { ...q, status: 'success' as const } : q))
            );
            // Remove from IndexedDB
            removeFromOfflineQueue(nextItem.id).catch(console.error);

            // Schedule next item with a delay to respect API quota
            nextTimerRef.current = setTimeout(() => {
                if (mountedRef.current) processNext();
            }, DELAY_BETWEEN_UPLOADS_MS);

        } else if (result === 'rate_limit') {
            // Global rate limit — pause everything with progressive backoff
            consecutiveRateLimitsRef.current += 1;
            const hitCount = consecutiveRateLimitsRef.current;

            setQueue((prev) =>
                prev.map((q) =>
                    q.id === nextItem.id
                        ? { ...q, status: 'pending' as const } // Don't increment retryCount for rate limits
                        : q
                )
            );
            setIsRateLimited(true);
            setIsUploading(false);

            // Progressive backoff: 30s → 60s → 120s → 180s max
            const baseBackoffMs = 30_000;
            const backoffMs = Math.min(baseBackoffMs * Math.pow(2, hitCount - 1), 180_000);
            const jitter = Math.random() * 5000;
            const totalWaitMs = backoffMs + jitter;
            console.log(`Rate limited (attempt #${hitCount}). Pausing uploads for ${Math.round(totalWaitMs / 1000)}s...`);

            rateLimitTimerRef.current = setTimeout(() => {
                if (mountedRef.current) {
                    setIsRateLimited(false);
                    processNext(); // Resume processing
                }
            }, totalWaitMs);

        } else {
            // Upload error — increment retry count
            const newRetryCount = nextItem.retryCount + 1;
            const isFinalFailure = newRetryCount >= MAX_RETRIES;

            setQueue((prev) =>
                prev.map((q) =>
                    q.id === nextItem.id
                        ? {
                            ...q,
                            status: isFinalFailure ? ('error' as const) : ('pending' as const),
                            retryCount: newRetryCount,
                            errorMessage: isFinalFailure
                                ? 'Max retries exceeded'
                                : `Upload failed, retry ${newRetryCount}/${MAX_RETRIES}`,
                        }
                        : q
                )
            );

            // Save to IndexedDB if permanently failed
            if (isFinalFailure) {
                saveToOfflineQueue({
                    ...nextItem,
                    status: 'error',
                    retryCount: newRetryCount,
                }).catch(console.error);
            }

            // Schedule next item (with delay)
            nextTimerRef.current = setTimeout(() => {
                if (mountedRef.current) processNext();
            }, DELAY_BETWEEN_UPLOADS_MS);
        }
    }, [uploadItem]);

    /**
     * Start processing the queue (entry point)
     */
    const startProcessing = useCallback(() => {
        if (processingRef.current || !mountedRef.current) return;
        processingRef.current = true;
        processNext();
    }, [processNext]);

    /**
     * Add a new item to the upload queue
     */
    const addToQueue = useCallback(
        (imageBase64: string, metadata: CaptureMetadata) => {
            const item: CaptureItem = {
                id: generateSessionId(),
                imageBase64,
                metadata,
                filename: `${metadata.label}_phase${metadata.phase}_${metadata.seq}_${Date.now()}.jpg`,
                status: 'pending',
                retryCount: 0,
            };

            setQueue((prev) => [...prev, item]);
        },
        []
    );

    /**
     * Retry all failed uploads
     */
    const retryFailed = useCallback(() => {
        setQueue((prev) =>
            prev.map((item) =>
                item.status === 'error' && item.retryCount >= MAX_RETRIES
                    ? { ...item, status: 'pending' as const, retryCount: 0 }
                    : item
            )
        );
    }, []);

    /**
     * Clear the queue
     */
    const clearQueue = useCallback(() => {
        setQueue([]);
        processingRef.current = false;
        if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
        if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
    }, []);

    /**
     * Load any items saved in IndexedDB
     */
    const loadOfflineQueue = useCallback(async () => {
        try {
            const offlineItems = await getOfflineQueue();
            if (offlineItems.length > 0) {
                setQueue((prev) => [...prev, ...offlineItems]);
            }
        } catch (err) {
            console.error('Failed to load offline queue:', err);
        }
    }, []);

    // Auto-start processing when pending items exist and we're not already processing 
    useEffect(() => {
        const hasPending = queue.some(
            (item) => item.status === 'pending' && item.retryCount < MAX_RETRIES
        );

        if (hasPending && !processingRef.current && !isRateLimited) {
            startProcessing();
        }
    }, [queue, isRateLimited, startProcessing]);

    // Load offline queue on mount
    useEffect(() => {
        loadOfflineQueue();
    }, [loadOfflineQueue]);

    return {
        queue,
        isUploading,
        isRateLimited,
        uploadProgress,
        addToQueue,
        retryFailed,
        clearQueue,
        loadOfflineQueue,
    };
}
