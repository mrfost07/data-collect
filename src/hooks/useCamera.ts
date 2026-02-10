'use client';

/**
 * Camera Hook
 * 
 * Handles camera access using navigator.mediaDevices.getUserMedia.
 * Provides stream management and permission state handling.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type CameraFacing = 'user' | 'environment';
export type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

interface UseCameraOptions {
    facing?: CameraFacing;
    width?: number;
    height?: number;
}

interface UseCameraReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    state: CameraState;
    facing: CameraFacing;
    error: string | null;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    switchCamera: () => Promise<void>;
    captureFrame: () => string | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
    const { facing: initialFacing = 'user', width = 640, height = 480 } = options;

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [state, setState] = useState<CameraState>('idle');
    const [facing, setFacing] = useState<CameraFacing>(initialFacing);
    const [error, setError] = useState<string | null>(null);

    // Use ref to check state without adding to dependencies
    const stateRef = useRef<CameraState>(state);
    stateRef.current = state;

    // Track auto-recovery attempts to prevent infinite loops
    const recoveryAttemptsRef = useRef(0);
    const MAX_RECOVERY_ATTEMPTS = 3;
    const mountedRef = useRef(true);

    /**
     * Request camera access and start the video stream
     */
    const startCamera = useCallback(async () => {
        if (stateRef.current === 'active' || stateRef.current === 'requesting') return;

        setState('requesting');
        setError(null);

        try {
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported in this browser');
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: facing,
                    width: { ideal: width },
                    height: { ideal: height },
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // If component unmounted while waiting for stream, stop it immediately
            if (!videoRef.current || !mountedRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            streamRef.current = stream;
            videoRef.current.srcObject = stream;

            // Listen for track ending (camera disconnected, another app grabbed it, etc.)
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    console.warn('Camera track ended unexpectedly');
                    if (!mountedRef.current) return;

                    // Auto-recover if under retry limit
                    if (recoveryAttemptsRef.current < MAX_RECOVERY_ATTEMPTS) {
                        recoveryAttemptsRef.current++;
                        console.log(`Auto-recovering camera (attempt ${recoveryAttemptsRef.current}/${MAX_RECOVERY_ATTEMPTS})...`);
                        setState('idle'); // Reset state so startCamera can run
                        // Delay briefly to let the OS release the camera
                        setTimeout(() => {
                            if (mountedRef.current) {
                                startCamera();
                            }
                        }, 1000);
                    } else {
                        setState('error');
                        setError('Camera disconnected. Please refresh the page to reconnect.');
                    }
                };

                videoTrack.onmute = () => {
                    console.warn('Camera track muted (possibly interrupted by OS or another app)');
                };

                videoTrack.onunmute = () => {
                    console.log('Camera track unmuted — stream resumed');
                };
            }

            // Handle play() promise safely
            try {
                await videoRef.current.play();
                setState('active');
                // Reset recovery counter on successful start
                recoveryAttemptsRef.current = 0;
            } catch (playError) {
                // Ignore AbortError which happens if video is removed from DOM
                if (playError instanceof Error && playError.name !== 'AbortError') {
                    throw playError;
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';

            // Only update state if we're not already unmounted (can check videoRef)
            if (videoRef.current) {
                // Handle specific error types
                if (err instanceof DOMException) {
                    switch (err.name) {
                        case 'NotAllowedError':
                        case 'PermissionDeniedError':
                            setState('denied');
                            setError('Camera permission denied. Please allow camera access in your browser settings.');
                            return;
                        case 'NotFoundError':
                        case 'DevicesNotFoundError':
                            setError('No camera found. Please ensure a camera is connected.');
                            break;
                        case 'NotReadableError':
                        case 'TrackStartError':
                            setError('Camera is in use by another application.');
                            break;
                        case 'OverconstrainedError':
                            setError('Camera does not support the requested resolution.');
                            break;
                        case 'AbortError':
                            // Ignore abort errors (element removed)
                            return;
                        default:
                            setError(errorMessage);
                    }
                } else {
                    setError(errorMessage);
                }

                setState('error');
            }
        }
    }, [facing, width, height]);

    /**
     * Stop the camera stream
     */
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.onended = null; // Remove listener to prevent auto-recovery after intentional stop
                track.onmute = null;
                track.onunmute = null;
                track.stop();
            });
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setState('idle');
    }, []);

    /**
     * Switch between front and back cameras
     */
    const switchCamera = useCallback(async () => {
        const newFacing = facing === 'user' ? 'environment' : 'user';
        setFacing(newFacing);

        if (state === 'active') {
            stopCamera();
            // Small delay before restarting with new facing
            await new Promise((resolve) => setTimeout(resolve, 100));
            await startCamera();
        }
    }, [facing, state, stopCamera, startCamera]);

    /**
     * Capture current video frame as JPEG base64
     */
    const captureFrame = useCallback((): string | null => {
        if (!videoRef.current || !canvasRef.current) return null;
        if (state !== 'active') return null;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame
        ctx.drawImage(video, 0, 0);

        // Convert to JPEG base64 (0.85 quality as specified)
        return canvas.toDataURL('image/jpeg', 0.85);
    }, [state]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => {
                    track.onended = null;
                    track.onmute = null;
                    track.onunmute = null;
                    track.stop();
                });
            }
        };
    }, []);

    return {
        videoRef,
        canvasRef,
        state,
        facing,
        error,
        startCamera,
        stopCamera,
        switchCamera,
        captureFrame,
    };
}
