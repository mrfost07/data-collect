'use client';

/**
 * MediaPipe FaceMesh Hook
 * 
 * Integrates MediaPipe FaceMesh for face landmark detection.
 * Provides eye region coordinates and face detection state.
 * 
 * LIMITATION NOTE:
 * Browser-based face mesh cannot verify actual eye gaze direction with
 * high accuracy. The landmarks show WHERE the eyes are, but determining
 * exactly what the user is looking at requires specialized hardware or
 * more advanced ML models. The guidance overlay helps users follow
 * instructions, but labeling accuracy depends on user compliance.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { FaceDetectionResult, FaceLandmarks } from '@/types';

// MediaPipe FaceMesh landmark indices
// Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
const LEFT_EYE_INDICES = [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
const RIGHT_EYE_INDICES = [
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
];

// Iris landmarks (more precise eye center)
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;

interface UseFaceMeshOptions {
    maxFaces?: number;
    refineLandmarks?: boolean;
}

interface UseFaceMeshReturn {
    isLoading: boolean;
    isReady: boolean;
    error: string | null;
    result: FaceDetectionResult | null;
    initialize: () => Promise<void>;
    processFrame: (video: HTMLVideoElement) => Promise<FaceDetectionResult | null>;
}

export function useFaceMesh(options: UseFaceMeshOptions = {}): UseFaceMeshReturn {
    const { maxFaces = 1, refineLandmarks = true } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<FaceDetectionResult | null>(null);

    const faceMeshRef = useRef<any>(null);

    /**
     * Calculate bounding box for a set of landmarks
     */
    const calculateBoundingBox = useCallback(
        (landmarks: FaceLandmarks[], indices: number[], videoWidth: number, videoHeight: number) => {
            const points = indices.map((i) => landmarks[i]).filter(Boolean);

            if (points.length === 0) return null;

            const xs = points.map((p) => p.x * videoWidth);
            const ys = points.map((p) => p.y * videoHeight);

            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            // Add padding
            const padding = 10;
            return {
                x: Math.max(0, minX - padding),
                y: Math.max(0, minY - padding),
                width: maxX - minX + padding * 2,
                height: maxY - minY + padding * 2,
            };
        },
        []
    );

    /**
     * Initialize MediaPipe FaceMesh
     */
    const initialize = useCallback(async () => {
        if (isReady || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            // Dynamically import MediaPipe (browser only)
            const FaceMeshModule = await import('@mediapipe/face_mesh');
            const { FaceMesh } = FaceMeshModule;

            const faceMesh = new FaceMesh({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                },
            });

            faceMesh.setOptions({
                maxNumFaces: maxFaces,
                refineLandmarks,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            // Initialize the model
            await faceMesh.initialize();

            faceMeshRef.current = faceMesh;
            setIsReady(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load FaceMesh';
            setError(errorMessage);
            console.error('FaceMesh initialization error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isReady, isLoading, maxFaces, refineLandmarks]);

    /**
     * Process a video frame and extract face landmarks
     */
    const processFrame = useCallback(
        async (video: HTMLVideoElement): Promise<FaceDetectionResult | null> => {
            if (!faceMeshRef.current || !isReady) {
                return null;
            }

            try {
                // Create a temporary canvas to capture the video frame
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');

                if (!ctx) return null;

                ctx.drawImage(video, 0, 0);

                // Process with FaceMesh
                const results = await faceMeshRef.current.send({ image: canvas });

                if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                    const noFaceResult: FaceDetectionResult = {
                        detected: false,
                        landmarks: null,
                    };
                    setResult(noFaceResult);
                    return noFaceResult;
                }

                const landmarks = results.multiFaceLandmarks[0] as FaceLandmarks[];

                // Calculate eye bounding boxes
                const leftEyeBox = calculateBoundingBox(
                    landmarks,
                    LEFT_EYE_INDICES,
                    video.videoWidth,
                    video.videoHeight
                );
                const rightEyeBox = calculateBoundingBox(
                    landmarks,
                    RIGHT_EYE_INDICES,
                    video.videoWidth,
                    video.videoHeight
                );

                const detectionResult: FaceDetectionResult = {
                    detected: true,
                    landmarks,
                    leftEyeBox: leftEyeBox || undefined,
                    rightEyeBox: rightEyeBox || undefined,
                };

                setResult(detectionResult);
                return detectionResult;
            } catch (err) {
                console.error('FaceMesh processing error:', err);
                return null;
            }
        },
        [isReady, calculateBoundingBox]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (faceMeshRef.current) {
                faceMeshRef.current.close?.();
            }
        };
    }, []);

    return {
        isLoading,
        isReady,
        error,
        result,
        initialize,
        processFrame,
    };
}

// Export landmark indices for use in overlay drawing
export { LEFT_EYE_INDICES, RIGHT_EYE_INDICES, LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER };
