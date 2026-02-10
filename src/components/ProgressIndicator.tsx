'use client';

/**
 * Progress Indicator Component
 * 
 * Displays live capture progress including:
 * - Phase indicator (A or B)
 * - Current label name
 * - Captures so far (per phase and overall)
 * - Visual progress bar
 */

import { PHASE_CONFIG } from '@/types';

interface ProgressIndicatorProps {
    currentLabel: string;
    currentPhase: 'A' | 'B';
    phaseCaptures: number;
    totalCaptures: number;
    isCapturing: boolean;
    timeRemaining?: number;
}

export function ProgressIndicator({
    currentLabel,
    currentPhase,
    phaseCaptures,
    totalCaptures,
    isCapturing,
    timeRemaining,
}: ProgressIndicatorProps) {
    const phaseProgress = (phaseCaptures / PHASE_CONFIG.IMAGES_PER_PHASE) * 100;
    const totalProgress = (totalCaptures / PHASE_CONFIG.TOTAL_IMAGES) * 100;

    return (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-4">
            {/* Status header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span
                        className={`w-3 h-3 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                            }`}
                    />
                    <span className="font-medium text-gray-900">
                        {isCapturing ? 'Recording' : 'Paused'}
                    </span>
                </div>
                {timeRemaining !== undefined && isCapturing && (
                    <span className="text-sm text-gray-600">
                        {Math.ceil(timeRemaining / 1000)}s remaining
                    </span>
                )}
            </div>

            {/* Phase and label info */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                        Phase {currentPhase}
                    </span>
                    <span className="text-sm text-gray-600">
                        {currentPhase === 'A' ? 'Eyes Only' : 'Face + Eyes'}
                    </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                    {currentLabel.replace(/_/g, ' ')}
                </h3>
            </div>

            {/* Phase progress */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Phase Progress</span>
                    <span className="font-medium text-gray-900">
                        {phaseCaptures}/{PHASE_CONFIG.IMAGES_PER_PHASE}
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary-500 transition-all duration-200 ease-out"
                        style={{ width: `${phaseProgress}%` }}
                    />
                </div>
            </div>

            {/* Overall progress */}
            <div>
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Total Progress</span>
                    <span className="font-medium text-gray-900">
                        {totalCaptures}/{PHASE_CONFIG.TOTAL_IMAGES}
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary-600 transition-all duration-200 ease-out"
                        style={{ width: `${totalProgress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
