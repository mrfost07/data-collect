'use client';

/**
 * Countdown Overlay Component
 * 
 * Enhanced countdown with visual direction arrows, phase info,
 * and clear instructions displayed as overlay on camera.
 */

import { useEffect, useState } from 'react';
import { LabelType, LABEL_INSTRUCTIONS } from '@/types';

interface CountdownOverlayProps {
    isActive: boolean;
    label: LabelType;
    phase: 'A' | 'B';
    onComplete: () => void;
}

// Direction arrows and visuals for each label
const DIRECTION_VISUALS: Record<LabelType, { arrow: string; emoji: string; color: string }> = {
    looking_center: { arrow: '◎', emoji: '👁️', color: 'text-primary-400' },
    looking_up: { arrow: '↑', emoji: '⬆️', color: 'text-blue-400' },
    looking_down: { arrow: '↓', emoji: '⬇️', color: 'text-green-400' },
    looking_left: { arrow: '←', emoji: '⬅️', color: 'text-yellow-400' },
    looking_right: { arrow: '→', emoji: '➡️', color: 'text-orange-400' },
    no_face: { arrow: '✕', emoji: '🚫', color: 'text-red-400' },
    with_cellphone: { arrow: '📱', emoji: '📱', color: 'text-purple-400' },
};

export function CountdownOverlay({
    isActive,
    label,
    phase,
    onComplete,
}: CountdownOverlayProps) {
    const [count, setCount] = useState<number | 'Go' | null>(null);

    useEffect(() => {
        if (!isActive) {
            setCount(null);
            return;
        }

        // Start 5 second countdown for user to read instructions
        setCount(5);

        const timer1 = setTimeout(() => setCount(4), 1000);
        const timer2 = setTimeout(() => setCount(3), 2000);
        const timer3 = setTimeout(() => setCount(2), 3000);
        const timer4 = setTimeout(() => setCount(1), 4000);
        const timer5 = setTimeout(() => setCount('Go'), 5000);
        const timer6 = setTimeout(() => {
            setCount(null);
            onComplete();
        }, 5500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
            clearTimeout(timer5);
            clearTimeout(timer6);
        };
    }, [isActive, onComplete]);

    if (!isActive || count === null) return null;

    const instruction =
        phase === 'A'
            ? LABEL_INSTRUCTIONS[label]?.eyesOnly
            : LABEL_INSTRUCTIONS[label]?.withFace;

    const visual = DIRECTION_VISUALS[label] || DIRECTION_VISUALS.looking_center;

    return (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-40">
            <div className="text-center px-4 max-w-lg mx-auto">
                {/* Phase badge */}
                <div className="mb-4 flex items-center justify-center gap-2">
                    <span className={`px-4 py-2 rounded-full font-bold text-sm ${phase === 'A'
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                        }`}>
                        Phase {phase}
                    </span>
                    <span className="px-6 py-2 bg-white/10 rounded-full text-white font-bold text-xl tracking-wide border border-white/20">
                        {phase === 'A' ? '👁️ EYES ONLY' : '🧑 EYES + FACE'}
                    </span>
                </div>

                {/* Phase description */}
                <p className="text-gray-300 text-lg md:text-xl font-medium mb-8 max-w-sm mx-auto leading-relaxed">
                    {phase === 'A'
                        ? 'Move ONLY your eyes, keep head still'
                        : 'Move your head AND eyes together'}
                </p>

                {/* Direction visual */}
                <div className="mb-4">
                    {label === 'looking_center' ? (
                        <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-primary-400 rounded-full flex items-center justify-center bg-primary-500/20 animate-pulse">
                            <div className="w-8 h-8 md:w-12 md:h-12 bg-primary-400 rounded-full" />
                        </div>
                    ) : label === 'no_face' ? (
                        <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-dashed border-red-400 rounded-full flex items-center justify-center">
                            <span className="text-5xl md:text-7xl">🚫</span>
                        </div>
                    ) : label === 'with_cellphone' ? (
                        <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-purple-400 rounded-full flex items-center justify-center bg-purple-500/20">
                            <span className="text-5xl md:text-7xl">📱</span>
                        </div>
                    ) : (
                        <div className={`text-7xl md:text-9xl ${visual.color} animate-bounce`}>
                            {visual.arrow}
                        </div>
                    )}
                </div>

                {/* Label name */}
                <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-wide">
                    {label.replace(/_/g, ' ').toUpperCase()}
                </h2>

                {/* Instruction box - simplified as requested */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl px-8 py-6 mb-8 mx-auto max-w-lg border-2 border-white/20">
                    <p className="text-white text-3xl md:text-5xl font-black tracking-wider uppercase drop-shadow-lg">
                        {phase === 'A' ? 'EYES ONLY' : 'EYES + FACE'}
                    </p>
                </div>

                {/* Countdown number */}
                <div className="relative">
                    <div
                        className={`text-8xl md:text-9xl font-black transition-all duration-300 ${count === 'Go'
                            ? 'text-primary-400 scale-125 animate-pulse'
                            : 'text-white'
                            }`}
                    >
                        {count}
                    </div>
                    {count !== 'Go' && (
                        <p className="text-gray-400 text-sm mt-2">Get ready...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
