'use client';

/**
 * Capture Session Component
 * 
 * Responsive layout:
 * - Desktop: Landscape with camera left, controls right
 * - Mobile: Portrait with camera top, compact controls bottom
 * All content fits on one screen without scrolling.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { CameraView } from './CameraView';
import { CountdownOverlay } from './CountdownOverlay';
import { UploadStatus } from './UploadStatus';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import {
    LabelType,
    CaptureMetadata,
    CaptureItem,
    PHASE_CONFIG,
    LABEL_INSTRUCTIONS,
} from '@/types';
import { generateSessionId, getDevicePlatform, getISOTimestamp } from '@/utils/helpers';

const DEFAULT_LABELS: LabelType[] = [
    'looking_center',
    'looking_down',
    'looking_up',
    'looking_left',
    'looking_right',
];

interface CaptureSessionProps {
    withCellphone: boolean;
    onComplete: () => void;
    onCancel: () => void;
}

type SessionStage = 'idle' | 'countdown' | 'capturing' | 'phaseComplete' | 'complete';

export function CaptureSession({
    withCellphone,
    onComplete,
    onCancel,
}: CaptureSessionProps) {
    const [sessionId] = useState(() => generateSessionId());
    const [stage, setStage] = useState<SessionStage>('idle');
    const [currentLabelIndex, setCurrentLabelIndex] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<'A' | 'B'>('A');
    const [phaseCaptures, setPhaseCaptures] = useState(0);
    const [totalCaptures, setTotalCaptures] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState<number>(PHASE_CONFIG.PHASE_DURATION_MS);
    const [showFaceWarning, setShowFaceWarning] = useState(false);
    const [allCaptures, setAllCaptures] = useState<CaptureItem[]>([]);
    const [showUploadPanel, setShowUploadPanel] = useState(false);
    const [uploadToken, setUploadToken] = useState<string>('');

    const labels: LabelType[] = [
        ...DEFAULT_LABELS,
        'no_face',
        ...(withCellphone ? ['with_cellphone' as LabelType] : []),
    ];

    const currentLabel = labels[currentLabelIndex];

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phaseStartTimeRef = useRef<number>(0);
    const stopCameraRef = useRef<(() => void) | null>(null);
    const tokenRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch upload token from server (instead of exposing API key in client bundle)
    useEffect(() => {
        let cancelled = false;

        async function fetchToken() {
            try {
                const response = await fetch('/api/auth/upload-token');
                if (!response.ok) {
                    console.error('Failed to fetch upload token:', response.status);
                    return;
                }
                const data = await response.json();
                if (!cancelled && data.token) {
                    setUploadToken(data.token);

                    // Schedule token refresh 2 minutes before expiry
                    const refreshIn = Math.max(0, data.expiresAt - Date.now() - 2 * 60 * 1000);
                    tokenRefreshRef.current = setTimeout(fetchToken, refreshIn);
                }
            } catch (err) {
                console.error('Failed to fetch upload token:', err);
                // Retry after 5 seconds
                if (!cancelled) {
                    tokenRefreshRef.current = setTimeout(fetchToken, 5000);
                }
            }
        }

        fetchToken();

        return () => {
            cancelled = true;
            if (tokenRefreshRef.current) clearTimeout(tokenRefreshRef.current);
        };
    }, []);

    const {
        queue: uploadQueue,
        isUploading,
        isRateLimited,
        uploadProgress,
        addToQueue,
        retryFailed,
    } = useUploadQueue(uploadToken);

    const handleVideoReady = useCallback(
        (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
            videoRef.current = video;
            canvasRef.current = canvas;
        },
        []
    );

    const captureFrame = useCallback((): string | null => {
        if (!videoRef.current || !canvasRef.current) return null;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.85);
    }, []);

    const processCapture = useCallback(
        (seq: number) => {
            const imageBase64 = captureFrame();
            if (!imageBase64) return;

            const metadata: CaptureMetadata = {
                label: currentLabel,
                phase: currentPhase,
                seq,
                timestamp_iso: getISOTimestamp(),
                ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                session_id: sessionId,
                camera_facing: 'user',
                device_platform: getDevicePlatform(),
            };

            addToQueue(imageBase64, metadata);

            const captureItem: CaptureItem = {
                id: `${sessionId}_${currentLabel}_${currentPhase}_${seq}`,
                imageBase64,
                metadata,
                filename: `${currentLabel}_phase${currentPhase}_${seq}_${Date.now()}.jpg`,
                status: 'pending',
                retryCount: 0,
            };
            setAllCaptures((prev) => [...prev, captureItem]);

            setPhaseCaptures((prev) => prev + 1);
            setTotalCaptures((prev) => prev + 1);
        },
        [captureFrame, currentLabel, currentPhase, sessionId, addToQueue]
    );

    // Handle phase completion - must be declared before startCapturing
    const handlePhaseComplete = useCallback(() => {
        if (captureIntervalRef.current) {
            cancelAnimationFrame(captureIntervalRef.current as unknown as number);
            captureIntervalRef.current = null;
        }

        if (currentPhase === 'A') {
            setCurrentPhase('B');
            setStage('countdown');
        } else {
            if (currentLabelIndex < labels.length - 1) {
                setCurrentLabelIndex((prev) => prev + 1);
                setCurrentPhase('A');
                setStage('countdown');
            } else {
                setStage('complete');
                // processQueue will handle remaining uploads, then useEffect triggers onComplete
            }
        }
    }, [currentPhase, currentLabelIndex, labels.length]);

    const startCapturing = useCallback(() => {
        setStage('capturing');
        setPhaseCaptures(0);
        phaseStartTimeRef.current = Date.now();
        setTimeRemaining(PHASE_CONFIG.PHASE_DURATION_MS);

        let captureCount = 0;
        let lastCaptureTime = 0;
        let lastTimeUpdate = 0;
        const minInterval = 100; // Minimum 100ms between captures to prevent overwhelming
        const timeUpdateInterval = 500; // Only update time display every 500ms to reduce re-renders

        // Use requestAnimationFrame for more reliable timing
        const captureLoop = () => {
            const now = Date.now();
            const elapsed = now - phaseStartTimeRef.current;
            const timeSinceLastCapture = now - lastCaptureTime;

            // Throttle time remaining updates to reduce re-renders (every 500ms)
            if (now - lastTimeUpdate >= timeUpdateInterval) {
                setTimeRemaining(Math.max(0, PHASE_CONFIG.PHASE_DURATION_MS - elapsed));
                lastTimeUpdate = now;
            }

            // Check if phase should end (time-based OR count-based, whichever comes first)
            if (captureCount >= PHASE_CONFIG.IMAGES_PER_PHASE || elapsed >= PHASE_CONFIG.PHASE_DURATION_MS + 500) {
                // If we haven't captured enough, do rapid captures
                while (captureCount < PHASE_CONFIG.IMAGES_PER_PHASE) {
                    captureCount++;
                    processCapture(captureCount);
                }
                handlePhaseComplete();
                return;
            }

            // Calculate if we should capture now based on time elapsed
            const expectedCaptures = Math.floor((elapsed / PHASE_CONFIG.PHASE_DURATION_MS) * PHASE_CONFIG.IMAGES_PER_PHASE);

            // Capture if we're behind schedule and enough time has passed since last capture
            if (captureCount < expectedCaptures && timeSinceLastCapture >= minInterval) {
                captureCount++;
                lastCaptureTime = now;
                processCapture(captureCount);
            }

            // Continue the loop
            captureIntervalRef.current = requestAnimationFrame(captureLoop) as unknown as ReturnType<typeof setInterval>;
        };

        // Start the capture loop
        lastCaptureTime = Date.now();
        lastTimeUpdate = Date.now();
        captureIntervalRef.current = requestAnimationFrame(captureLoop) as unknown as ReturnType<typeof setInterval>;
    }, [processCapture, handlePhaseComplete]);

    const startSession = useCallback(() => {
        setStage('countdown');
    }, []);

    const retryPhase = useCallback(() => {
        setAllCaptures((prev) =>
            prev.filter(
                (c) => !(c.metadata.label === currentLabel && c.metadata.phase === currentPhase)
            )
        );
        setPhaseCaptures(0);
        setStage('countdown');
    }, [currentLabel, currentPhase]);

    const downloadSession = useCallback(async () => {
        const zip = new JSZip();

        for (const capture of allCaptures) {
            const folder = zip.folder(
                `${capture.metadata.label}/${capture.metadata.phase === 'A' ? 'eyes_only' : 'with_face'}`
            );

            if (folder) {
                const imageData = capture.imageBase64.replace(/^data:image\/\w+;base64,/, '');
                folder.file(capture.filename, imageData, { base64: true });
                folder.file(
                    capture.filename.replace('.jpg', '.json'),
                    JSON.stringify(capture.metadata, null, 2)
                );
            }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `face_data_${sessionId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [allCaptures, sessionId]);

    const cancelSession = useCallback(() => {
        // Cancel any ongoing capture animation
        if (captureIntervalRef.current) {
            cancelAnimationFrame(captureIntervalRef.current as unknown as number);
            captureIntervalRef.current = null;
        }
        // Stop the camera explicitly
        if (stopCameraRef.current) {
            stopCameraRef.current();
        }
        onCancel();
    }, [onCancel]);

    useEffect(() => {
        return () => {
            if (captureIntervalRef.current) {
                cancelAnimationFrame(captureIntervalRef.current as unknown as number);
            }
        };
    }, []);

    // Handle completion only when uploads are finished
    useEffect(() => {
        if (stage === 'complete') {
            const pendingUploads = uploadProgress.pending;

            if (pendingUploads === 0) {
                // Short delay to show 100% completion before switching
                const timer = setTimeout(() => {
                    onComplete();
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [stage, uploadProgress.pending, onComplete]);

    const currentInstruction =
        currentPhase === 'A'
            ? LABEL_INSTRUCTIONS[currentLabel]?.eyesOnly
            : LABEL_INSTRUCTIONS[currentLabel]?.withFace;

    const totalLabels = labels.length;
    const pendingUploads = uploadQueue.filter(q => q.status === 'pending' || q.status === 'uploading').length;

    // Calculate upload progress percentage
    const totalUploads = uploadQueue.length;
    const uploadPercent = totalUploads > 0 ? Math.round(((totalUploads - pendingUploads) / totalUploads) * 100) : 0;

    return (
        <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden">
            {/* Compact Header */}
            <header className="flex items-center justify-between px-3 py-2 bg-black/30 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-sm md:text-base">Face Data Collector</span>
                </div>
                <button
                    onClick={cancelSession}
                    className="px-3 py-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
                >
                    Cancel
                </button>
            </header>

            {/* Main Content - Responsive Layout */}
            <main className="flex-1 flex flex-col lg:flex-row gap-2 md:gap-4 p-2 md:p-4 min-h-0 overflow-hidden relative">

                {/* Full Screen Uploading Overlay when Waiting for Uploads */}
                {stage === 'complete' && pendingUploads > 0 && (
                    <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-20 h-20 bg-primary-900/50 rounded-full flex items-center justify-center mb-6 relative">
                            <svg className="w-10 h-10 text-primary-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <div className="absolute inset-0 border-4 border-primary-500/30 rounded-full animate-pulse"></div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Finalizing Session...</h2>
                        <p className="text-gray-400 mb-8 max-w-md">
                            Please wait while we securely upload your remaining images. Do not close this tab.
                        </p>

                        <div className="w-full max-w-md bg-gray-800 rounded-full h-4 overflow-hidden mb-2 border border-gray-700">
                            <div
                                className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-300 ease-out"
                                style={{ width: `${uploadPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between w-full max-w-md text-sm text-gray-500 font-medium">
                            <span>{pendingUploads} remaining</span>
                            <span>{uploadPercent}%</span>
                        </div>

                        {/* Show retry details if rate limited */}
                        <div className="mt-8">
                            <UploadStatus
                                queue={uploadQueue}
                                isUploading={isUploading}
                                isRateLimited={isRateLimited}
                                uploadProgress={uploadProgress}
                                onRetryFailed={() => { }}
                            />
                        </div>
                    </div>
                )}

                {/* Camera View */}
                <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
                    <div className="relative flex-1 min-h-0">
                        <CameraView
                            onVideoReady={handleVideoReady}
                            onCameraStop={(stopFn) => { stopCameraRef.current = stopFn; }}
                            currentLabel={currentLabel}
                            currentPhase={currentPhase}
                            isCapturing={stage === 'capturing'}
                            showFaceWarning={showFaceWarning}
                            phaseCaptures={phaseCaptures}
                            timeRemaining={timeRemaining}
                        />

                        {/* Countdown Overlay */}
                        <CountdownOverlay
                            isActive={stage === 'countdown'}
                            label={currentLabel}
                            phase={currentPhase}
                            onComplete={startCapturing}
                        />
                    </div>
                </div>

                {/* Controls Panel - Responsive */}
                <div className="lg:w-72 xl:w-80 flex flex-col gap-2 min-h-0 flex-shrink-0">
                    {/* Mobile: Compact horizontal layout */}
                    <div className="lg:hidden">
                        {/* Compact Status Bar */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stage === 'capturing' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                                    <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded">
                                        Phase {currentPhase}
                                    </span>
                                    <span className="text-white font-bold capitalize text-sm">
                                        {currentLabel.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <span className="text-white font-bold">{phaseCaptures}/50</span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-200"
                                    style={{ width: `${(phaseCaptures / 50) * 100}%` }}
                                />
                            </div>

                            {/* Action buttons row */}
                            <div className="flex gap-2">
                                {stage === 'idle' && (
                                    <button
                                        onClick={startSession}
                                        className="flex-1 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold text-sm"
                                    >
                                        Start Capture
                                    </button>
                                )}

                                {stage === 'capturing' && (
                                    <button
                                        onClick={retryPhase}
                                        className="flex-1 py-2 border border-white/20 rounded-lg text-white text-sm"
                                    >
                                        Retry
                                    </button>
                                )}

                                {allCaptures.length > 0 && (
                                    <button
                                        onClick={downloadSession}
                                        className="py-2 px-3 border border-primary-400/50 rounded-lg text-primary-300 text-sm"
                                    >
                                        Download ({allCaptures.length})
                                    </button>
                                )}

                                {/* Upload indicator */}
                                <button
                                    onClick={() => setShowUploadPanel(!showUploadPanel)}
                                    className={`py-2 px-3 rounded-lg text-sm flex items-center gap-1 ${isUploading ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-gray-400'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {pendingUploads > 0 && <span>{pendingUploads}</span>}
                                </button>
                            </div>
                        </div>

                        {/* Mobile Upload Panel (collapsible) */}
                        {showUploadPanel && (
                            <div className="mt-2 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 max-h-32 overflow-y-auto">
                                <UploadStatus
                                    queue={uploadQueue}
                                    isUploading={isUploading}
                                    isRateLimited={isRateLimited}
                                    uploadProgress={uploadProgress}
                                    onRetryFailed={retryFailed}
                                />
                            </div>
                        )}
                    </div>

                    {/* Desktop: Full panel layout */}
                    <div className="hidden lg:flex flex-col gap-3 flex-1 min-h-0">
                        {/* Status Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-3 h-3 rounded-full ${stage === 'capturing' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="text-white font-medium">
                                    {stage === 'idle' ? 'Ready' : stage === 'capturing' ? 'Recording' : stage === 'countdown' ? 'Starting...' : 'Complete'}
                                </span>
                            </div>

                            {/* Current label and phase */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded">
                                        Phase {currentPhase}
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                        {currentPhase === 'A' ? 'Eyes Only' : 'With Face'}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-white capitalize">
                                    {currentLabel.replace(/_/g, ' ')}
                                </h2>
                            </div>

                            {/* Instruction */}
                            {currentInstruction && (
                                <p className="text-sm text-primary-300 bg-primary-900/30 rounded-lg px-3 py-2 mb-4">
                                    {currentInstruction}
                                </p>
                            )}

                            {/* Progress bars */}
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Phase Progress</span>
                                        <span className="text-white font-medium">{phaseCaptures}/50</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-500 transition-all duration-200"
                                            style={{ width: `${(phaseCaptures / 50) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Total Progress</span>
                                        <span className="text-white font-medium">{totalCaptures}/100</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-200"
                                            style={{ width: `${(totalCaptures / 100) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Labels ({currentLabelIndex + 1}/{totalLabels})</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-200"
                                            style={{ width: `${((currentLabelIndex + 1) / totalLabels) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upload Status */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex-1 min-h-0 overflow-hidden">
                            <UploadStatus
                                queue={uploadQueue}
                                isUploading={isUploading}
                                isRateLimited={isRateLimited}
                                uploadProgress={uploadProgress}
                                onRetryFailed={retryFailed}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {stage === 'idle' && (
                                <button
                                    onClick={startSession}
                                    className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg"
                                >
                                    Start Capture
                                </button>
                            )}

                            {(stage === 'capturing' || stage === 'phaseComplete') && (
                                <button
                                    onClick={retryPhase}
                                    className="flex-1 py-2 border border-white/20 rounded-xl text-white text-sm hover:bg-white/10 transition-colors"
                                >
                                    Retry Phase
                                </button>
                            )}

                            {allCaptures.length > 0 && (
                                <button
                                    onClick={downloadSession}
                                    className="flex-1 py-2 border border-primary-400/50 rounded-xl text-primary-300 text-sm hover:bg-primary-500/10 transition-colors"
                                >
                                    Download ({allCaptures.length})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
