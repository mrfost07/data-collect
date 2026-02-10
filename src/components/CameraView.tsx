'use client';

/**
 * Camera View Component
 * 
 * Enhanced camera display with video feed, face overlay,
 * and on-screen instructions for gaze direction.
 */

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useFaceMesh } from '@/hooks/useFaceMesh';
import { FaceOverlay } from './FaceOverlay';
import { LabelType, LABEL_INSTRUCTIONS } from '@/types';

interface CameraViewProps {
    onVideoReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
    onCameraStop?: (stopFn: () => void) => void;
    currentLabel: LabelType;
    currentPhase?: 'A' | 'B';
    isCapturing: boolean;
    showFaceWarning?: boolean;
    phaseCaptures?: number;
    timeRemaining?: number;
}

// Arrow icons for each gaze direction
const DIRECTION_ARROWS: Record<string, { rotation: string; icon: string }> = {
    looking_center: { rotation: 'rotate-0', icon: '◎' },
    looking_up: { rotation: '-rotate-90', icon: '↑' },
    looking_down: { rotation: 'rotate-90', icon: '↓' },
    looking_left: { rotation: 'rotate-180', icon: '←' },
    looking_right: { rotation: 'rotate-0', icon: '→' },
    no_face: { rotation: 'rotate-0', icon: '🚫' },
    with_cellphone: { rotation: 'rotate-0', icon: '📱' },
};

export function CameraView({
    onVideoReady,
    onCameraStop,
    currentLabel,
    currentPhase = 'A',
    isCapturing,
    showFaceWarning = false,
    phaseCaptures = 0,
    timeRemaining = 10000,
}: CameraViewProps) {
    const { videoRef, canvasRef, state, error, startCamera, stopCamera, facing } = useCamera();
    const { isReady: faceMeshReady, result: faceResult, initialize, processFrame } = useFaceMesh();

    const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
    const animationFrameRef = useRef<number | null>(null);
    const onCameraStopCalledRef = useRef(false);

    // Initialize camera on mount, cleanup on unmount
    useEffect(() => {
        startCamera();

        // Cleanup: Stop camera when component unmounts
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Expose stop function to parent (separate effect to avoid re-running camera init)
    useEffect(() => {
        if (onCameraStop && !onCameraStopCalledRef.current) {
            onCameraStop(stopCamera);
            onCameraStopCalledRef.current = true;
        }
    }, [onCameraStop, stopCamera]);

    // Initialize FaceMesh when camera is ready
    useEffect(() => {
        if (state === 'active' && !faceMeshReady) {
            initialize();
        }
    }, [state, faceMeshReady, initialize]);

    // Notify parent when video is ready
    const onVideoReadyCalledRef = useRef(false);
    useEffect(() => {
        if (state === 'active' && videoRef.current && canvasRef.current && !onVideoReadyCalledRef.current) {
            onVideoReady(videoRef.current, canvasRef.current);
            onVideoReadyCalledRef.current = true;

            const video = videoRef.current;
            if (video.videoWidth && video.videoHeight) {
                setVideoDimensions({
                    width: video.videoWidth,
                    height: video.videoHeight,
                });
            }
        }
    }, [state, onVideoReady]);

    // Process frames for face detection (pause during capture to prevent glitching)
    useEffect(() => {
        // Skip face detection during capture to reduce CPU load and prevent glitching
        if (!faceMeshReady || state !== 'active' || !videoRef.current || isCapturing) return;

        let isActive = true;
        const processLoop = async () => {
            if (isActive && videoRef.current) {
                await processFrame(videoRef.current);
                animationFrameRef.current = requestAnimationFrame(processLoop);
            }
        };

        processLoop();

        return () => {
            isActive = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [faceMeshReady, state, processFrame, isCapturing]);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
            });
        }
    };

    // Get current instruction
    const instruction = currentPhase === 'A'
        ? LABEL_INSTRUCTIONS[currentLabel]?.eyesOnly
        : LABEL_INSTRUCTIONS[currentLabel]?.withFace;

    const directionInfo = DIRECTION_ARROWS[currentLabel] || DIRECTION_ARROWS.looking_center;
    const secondsRemaining = Math.ceil(timeRemaining / 1000);

    // Camera error states
    if (state === 'denied') {
        return (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Camera Permission Denied</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <p className="text-sm text-gray-500">
                    Please allow camera access in your browser settings and refresh the page.
                </p>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-center">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
                <p className="text-gray-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-2xl">
            {/* Loading state */}
            {state === 'requesting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white text-lg font-medium">Requesting camera access...</p>
                        <p className="text-gray-400 text-sm mt-2">Please allow camera permission</p>
                    </div>
                </div>
            )}

            {/* Video element */}
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleLoadedMetadata}
            />

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Face overlay */}
            {state === 'active' && (
                <FaceOverlay
                    detectionResult={faceResult}
                    videoWidth={videoDimensions.width}
                    videoHeight={videoDimensions.height}
                    currentLabel={currentLabel}
                    showWarning={showFaceWarning && isCapturing}
                />
            )}

            {/* On-screen instruction overlay */}
            {state === 'active' && (
                <>
                    {/* Top bar - Status and Timer */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                        <div className="flex items-center justify-between">
                            {/* Camera indicator */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
                                <div className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                <span className="text-white text-sm font-medium">
                                    {facing === 'user' ? 'Front' : 'Back'} Camera
                                </span>
                            </div>

                            {/* Timer when capturing */}
                            {isCapturing && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-full shadow-lg">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <span className="text-white font-bold text-lg">{secondsRemaining}s</span>
                                </div>
                            )}

                            {/* Phase indicator */}
                            <div className="px-3 py-1.5 bg-primary-600/90 backdrop-blur-sm rounded-full">
                                <span className="text-white text-sm font-medium">
                                    Phase {currentPhase} • {phaseCaptures}/50
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Center direction indicator */}
                    {isCapturing && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                {/* Large direction indicator */}
                                <div className="mb-4">
                                    {currentLabel === 'no_face' ? (
                                        <div className="w-32 h-32 mx-auto border-4 border-dashed border-yellow-400 rounded-full flex items-center justify-center">
                                            <span className="text-6xl">🚫</span>
                                        </div>
                                    ) : currentLabel === 'with_cellphone' ? (
                                        <div className="w-32 h-32 mx-auto border-4 border-blue-400 rounded-full flex items-center justify-center bg-blue-500/20">
                                            <span className="text-6xl">📱</span>
                                        </div>
                                    ) : currentLabel === 'looking_center' ? (
                                        <div className="w-24 h-24 mx-auto border-4 border-primary-400 rounded-full flex items-center justify-center bg-primary-500/20">
                                            <div className="w-8 h-8 bg-primary-400 rounded-full" />
                                        </div>
                                    ) : (
                                        <div className="text-8xl text-white drop-shadow-lg animate-pulse">
                                            {directionInfo.icon}
                                        </div>
                                    )}
                                </div>

                                {/* Instruction badge */}
                                <div className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl max-w-sm mx-auto">
                                    <p className="text-white font-semibold text-lg mb-1">
                                        {currentLabel.replace(/_/g, ' ').toUpperCase()}
                                    </p>
                                    <p className="text-primary-300 text-sm">
                                        {instruction}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom bar - Current gaze direction when not capturing */}
                    {!isCapturing && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                                    <p className="text-white text-center">
                                        <span className="text-gray-400 text-sm">Next: </span>
                                        <span className="font-semibold">{currentLabel.replace(/_/g, ' ')}</span>
                                        <span className="text-gray-400 text-sm ml-2">({currentPhase === 'A' ? 'Eyes Only' : 'With Face'})</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Corner capture counter */}
                    {isCapturing && (
                        <div className="absolute bottom-4 right-4">
                            <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg">
                                <p className="text-white text-center">
                                    <span className="text-4xl font-bold text-primary-400">{phaseCaptures}</span>
                                    <span className="text-gray-400 text-lg">/50</span>
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
