'use client';

/**
 * Upload Status Component
 * 
 * Displays upload queue status and per-file progress.
 */

import { CaptureItem } from '@/types';

interface UploadStatusProps {
    queue: CaptureItem[];
    isUploading: boolean;
    uploadProgress: { success: number; failed: number; pending: number };
    onRetryFailed: () => void;
    isRateLimited?: boolean;
}

export function UploadStatus({
    queue,
    isUploading,
    uploadProgress,
    onRetryFailed,
    isRateLimited,
}: UploadStatusProps) {
    const { success, failed, pending } = uploadProgress;
    const total = queue.length;

    if (total === 0) return null;

    const getStatusIcon = (status: CaptureItem['status']) => {
        switch (status) {
            case 'success':
                return (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'uploading':
                return (
                    <svg
                        className="w-4 h-4 text-primary-500 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                );
            default:
                return <div className="w-4 h-4 rounded-full bg-gray-300" />;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Upload Status</h3>
                {isUploading && (
                    <span className="flex items-center gap-1 text-sm text-primary-600">
                        <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Uploading...
                    </span>
                )}
            </div>

            {/* Summary stats */}
            <div className="flex gap-4 mb-3 text-sm">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-600">{success} uploaded</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-gray-600">{pending} pending</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-600">{failed} failed</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(success / total) * 100}%` }}
                />
            </div>

            {/* Retry button */}
            {failed > 0 && (
                <button
                    onClick={onRetryFailed}
                    className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    Retry {failed} failed uploads
                </button>
            )}

            {/* Recent items list */}
            <div className="mt-3 max-h-32 overflow-y-auto">
                {queue.slice(-5).reverse().map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 py-1 text-sm border-b border-gray-100 last:border-0"
                    >
                        {getStatusIcon(item.status)}
                        <span className="text-gray-600 truncate flex-1">
                            {item.metadata.label} - #{item.metadata.seq}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
