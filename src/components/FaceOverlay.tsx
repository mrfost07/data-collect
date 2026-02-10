'use client';

/**
 * Face Overlay Component
 * 
 * Renders face mesh landmarks and eye region boxes on a canvas overlay.
 * Provides visual guidance for user positioning.
 * 
 * LIMITATION: This overlay helps users see their face position but cannot
 * verify actual gaze direction. Labeling accuracy depends on user compliance.
 */

import { useEffect, useRef } from 'react';
import { FaceDetectionResult, FaceLandmarks, LabelType } from '@/types';
import { LEFT_EYE_INDICES, RIGHT_EYE_INDICES } from '@/hooks/useFaceMesh';

interface FaceOverlayProps {
    detectionResult: FaceDetectionResult | null;
    videoWidth: number;
    videoHeight: number;
    currentLabel: LabelType;
    showWarning: boolean;
}

export function FaceOverlay({
    detectionResult,
    videoWidth,
    videoHeight,
    currentLabel,
    showWarning,
}: FaceOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Clear previous drawings
        ctx.clearRect(0, 0, videoWidth, videoHeight);

        if (!detectionResult?.detected || !detectionResult.landmarks) {
            // Show no face warning if not in no_face mode
            if (showWarning && currentLabel !== 'no_face') {
                ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
                ctx.fillRect(0, 0, videoWidth, videoHeight);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 18px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText('Face not detected', videoWidth / 2, videoHeight / 2);
            }
            return;
        }

        const landmarks = detectionResult.landmarks;

        // Draw face mesh contour (subtle)
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.lineWidth = 1;

        // Draw basic face outline using key points
        const faceOutlineIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
            378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
            162, 21, 54, 103, 67, 109, 10,
        ];

        ctx.beginPath();
        for (let i = 0; i < faceOutlineIndices.length; i++) {
            const idx = faceOutlineIndices[i];
            const point = landmarks[idx];
            if (!point) continue;

            const x = point.x * videoWidth;
            const y = point.y * videoHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw eye regions with boxes
        const drawEyeBox = (box: { x: number; y: number; width: number; height: number }) => {
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
        };

        if (detectionResult.leftEyeBox) {
            drawEyeBox(detectionResult.leftEyeBox);
        }

        if (detectionResult.rightEyeBox) {
            drawEyeBox(detectionResult.rightEyeBox);
        }

        // Draw eye landmarks
        const drawEyeLandmarks = (indices: number[]) => {
            ctx.fillStyle = '#16A34A';
            for (const idx of indices) {
                const point = landmarks[idx];
                if (!point) continue;

                ctx.beginPath();
                ctx.arc(point.x * videoWidth, point.y * videoHeight, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        drawEyeLandmarks(LEFT_EYE_INDICES);
        drawEyeLandmarks(RIGHT_EYE_INDICES);

        // Draw gaze direction hint based on label
        const centerX = videoWidth / 2;
        const centerY = videoHeight / 3;

        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';

        let arrowText = '';
        switch (currentLabel) {
            case 'looking_up':
                arrowText = 'Look UP';
                break;
            case 'looking_down':
                arrowText = 'Look DOWN';
                break;
            case 'looking_left':
                arrowText = 'Look LEFT';
                break;
            case 'looking_right':
                arrowText = 'Look RIGHT';
                break;
            case 'looking_center':
                arrowText = 'Look STRAIGHT';
                break;
        }

        if (arrowText) {
            ctx.fillText(arrowText, centerX, 30);
        }
    }, [detectionResult, videoWidth, videoHeight, currentLabel, showWarning]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
        />
    );
}
