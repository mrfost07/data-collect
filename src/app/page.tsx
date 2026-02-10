'use client';

/**
 * Main Landing Page
 * 
 * Clean, minimal design with solid colors, no gradients, no emojis.
 * Responsive across all devices. Keeps existing images and logo.
 */

import { useState } from 'react';
import { ConsentModal } from '@/components/ConsentModal';
import { CaptureSession } from '@/components/CaptureSession';

type AppState = 'landing' | 'consent' | 'session' | 'complete';

export default function Home() {
    const [appState, setAppState] = useState<AppState>('landing');
    const [withCellphone, setWithCellphone] = useState(false);

    const handleStartClick = () => setAppState('consent');
    const handleConsent = () => setAppState('session');
    const handleDecline = () => setAppState('landing');
    const handleSessionComplete = () => setAppState('complete');
    const handleSessionCancel = () => setAppState('landing');
    const handleNewSession = () => setAppState('landing');

    // Render session view
    if (appState === 'session') {
        return (
            <CaptureSession
                withCellphone={withCellphone}
                onComplete={handleSessionComplete}
                onCancel={handleSessionCancel}
            />
        );
    }

    // Render complete view
    if (appState === 'complete') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-200">
                    <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Complete</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Thank you for contributing. Your images are being uploaded securely to the cloud.
                    </p>
                    <button
                        onClick={handleNewSession}
                        className="w-full py-3.5 px-6 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Start New Session
                    </button>
                </div>
            </div>
        );
    }

    // Render landing page
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Consent Modal */}
            <ConsentModal
                isOpen={appState === 'consent'}
                onConsent={handleConsent}
                onDecline={handleDecline}
            />

            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="CCIS CodeHub Logo"
                            className="w-10 h-10 object-contain"
                        />
                        <div>
                            <h1 className="text-base font-bold text-gray-900 leading-tight">
                                Face Data Collector
                            </h1>
                            <a
                                href="https://ccis-codehub.space"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 font-medium hover:text-primary-700 hover:underline"
                            >
                                CCIS CodeHub AI Training
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-2xl w-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                        {/* Hero section */}
                        <div className="relative h-44 sm:h-52 overflow-hidden">
                            <img
                                src="/homepage.png"
                                alt="AI Face Recognition"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60" />
                            <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
                                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-3 border border-white/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                                    Contribute to AI Training
                                </h2>
                                <p className="text-white/70 text-sm max-w-sm">
                                    Help train our AI by providing labeled face images for gaze recognition
                                </p>
                            </div>
                        </div>

                        <div className="p-5 sm:p-8">

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="text-center py-3 px-2 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900">100</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Images / Session</div>
                                </div>
                                <div className="text-center py-3 px-2 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900">20s</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Per Phase</div>
                                </div>
                                <div className="text-center py-3 px-2 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900">6</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Gaze Directions</div>
                                </div>
                            </div>

                            {/* How It Works */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    How It Works
                                </h3>
                                <div className="space-y-2">
                                    {[
                                        { text: 'Grant camera access when prompted' },
                                        { text: 'Follow on-screen gaze direction prompts' },
                                        { text: 'Hold still during 20-second capture phases' },
                                        { text: 'Images upload automatically in the background' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                            <span className="w-6 h-6 bg-primary-600 text-white rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm text-gray-600">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Capture Modes */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Capture Modes
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {[
                                        {
                                            src: '/eyes-only.png',
                                            label: 'Phase A: Eyes Only',
                                            desc: 'Move only your eyes in the directed gaze',
                                            accent: 'bg-blue-50 text-blue-700 border-blue-100',
                                        },
                                        {
                                            src: '/with-face.png',
                                            label: 'Phase B: With Face',
                                            desc: 'Turn your whole head in the directed gaze',
                                            accent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                        },
                                        {
                                            src: '/with-cp.png',
                                            label: 'With Cellphone',
                                            desc: 'Hold your phone visible while looking',
                                            accent: 'bg-amber-50 text-amber-700 border-amber-100',
                                        },
                                        {
                                            src: '/no-face.png',
                                            label: 'No Face',
                                            desc: 'Keep your face completely out of frame',
                                            accent: 'bg-rose-50 text-rose-700 border-rose-100',
                                        },
                                    ].map((mode) => (
                                        <div
                                            key={mode.label}
                                            className="rounded-xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
                                        >
                                            <div className="aspect-video bg-gray-100">
                                                <img
                                                    src={mode.src}
                                                    alt={mode.label}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div className="p-2 sm:p-2.5">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold border ${mode.accent} mb-1`}>
                                                    {mode.label}
                                                </span>
                                                <p className="text-[11px] sm:text-xs text-gray-500 leading-snug">
                                                    {mode.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Session Options */}
                            <div className="mb-6 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={withCellphone}
                                        onChange={(e) => setWithCellphone(e.target.checked)}
                                        className="w-4.5 h-4.5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-800 font-medium group-hover:text-gray-900">
                                            Include &quot;with cellphone&quot; captures
                                        </span>
                                        <p className="text-xs text-gray-400">Hold phone visible in frame during capture</p>
                                    </div>
                                </label>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStartClick}
                                className="w-full py-3.5 px-6 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 active:bg-primary-800 transition-colors"
                            >
                                Start Data Collection
                            </button>

                            {/* Privacy note */}
                            <p className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Your privacy is protected. Consent required before any data collection.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-4">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <p className="text-xs text-gray-400 text-center">
                        <a href="https://ccis-codehub.space" target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:text-primary-700 hover:underline">CCIS CodeHub Platform</a>
                        {' '}&mdash; Developed by Mark Renier B. Fostanes
                    </p>
                </div>
            </footer>
        </div>
    );
}
