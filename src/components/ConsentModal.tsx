'use client';

/**
 * Consent Modal Component
 * 
 * Clean, minimal consent form. No emojis, no gradients.
 * Compliant with Philippine Data Privacy Act (RA 10173).
 * Responsive across all devices.
 */

import { useState } from 'react';

interface ConsentModalProps {
    isOpen: boolean;
    onConsent: () => void;
    onDecline: () => void;
}

export function ConsentModal({ isOpen, onConsent, onDecline }: ConsentModalProps) {
    const [isChecked, setIsChecked] = useState(false);
    const [showFullTerms, setShowFullTerms] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl my-2 sm:my-4 max-h-[92vh] overflow-hidden flex flex-col">
                <div className="p-5 sm:p-6 overflow-y-auto flex-1">

                    {/* Header */}
                    <div className="text-center mb-5">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-0.5">
                            Data Collection Consent
                        </h2>
                        <a
                            href="https://ccis-codehub.space"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                        >
                            CCIS CodeHub AI Training Program
                        </a>
                    </div>

                    {/* Introduction */}
                    <div className="mb-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            This application collects facial images through your device camera for training an{' '}
                            <strong className="text-gray-900">Artificial Intelligence (AI)</strong> model
                            for the <strong className="text-gray-900">CCIS CodeHub Platform</strong>.
                        </p>
                    </div>

                    {/* Info cards */}
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {/* Data Controller */}
                        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900">Data Controller</h3>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                <strong>Mark Renier B. Fostanes</strong><br />
                                BS Computer Science<br />
                                CCIS CodeHub Platform Developer
                            </p>
                        </div>

                        {/* Data Collected */}
                        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900">Data Collected</h3>
                            </div>
                            <ul className="text-xs text-gray-600 space-y-1">
                                {['Facial images (JPEG)', 'Device information', 'Anonymous session ID', 'Capture timestamp'].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Purpose & Storage */}
                    <div className="space-y-2.5 mb-4">
                        <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-2.5 h-2.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-900">Purpose</p>
                                <p className="text-xs text-gray-500">
                                    Training AI models to recognize facial features and gaze directions for educational and research purposes.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-2.5 h-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-900">Storage &amp; Security</p>
                                <p className="text-xs text-gray-500">
                                    Data stored securely in cloud storage with encryption. Access limited to authorized personnel only.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Legal terms toggle */}
                    <button
                        onClick={() => setShowFullTerms(!showFullTerms)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 font-medium hover:text-gray-700 transition-colors mb-4"
                    >
                        <svg className={`w-3.5 h-3.5 transition-transform ${showFullTerms ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {showFullTerms ? 'Hide' : 'View'} Legal Terms &amp; Data Protection Notice
                    </button>

                    {showFullTerms && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-xs text-gray-500 max-h-52 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-1.5 flex items-center gap-2">
                                        <span className="w-5 h-5 bg-gray-700 text-white rounded flex items-center justify-center text-[10px]">1</span>
                                        Legal Compliance
                                    </h4>
                                    <p className="mb-1.5">This data collection complies with:</p>
                                    <ul className="space-y-1 ml-4">
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-gray-400 mt-0.5">&#x2022;</span>
                                            <span><strong>Republic Act No. 10173</strong> &mdash; Data Privacy Act of 2012 (Philippines)</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-gray-400 mt-0.5">&#x2022;</span>
                                            <span><strong>NPC Circular 2023-06</strong> &mdash; Guidelines on Consent</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-gray-400 mt-0.5">&#x2022;</span>
                                            <span>General Data Protection principles</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-800 mb-1.5 flex items-center gap-2">
                                        <span className="w-5 h-5 bg-gray-700 text-white rounded flex items-center justify-center text-[10px]">2</span>
                                        Your Rights Under RA 10173
                                    </h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 ml-4">
                                        {[
                                            'Right to be informed',
                                            'Right to access',
                                            'Right to object',
                                            'Right to erasure',
                                            'Right to rectification',
                                            'Right to portability',
                                        ].map((right) => (
                                            <span key={right} className="flex items-center gap-1 text-gray-600">
                                                <svg className="w-3 h-3 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {right}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-800 mb-1.5 flex items-center gap-2">
                                        <span className="w-5 h-5 bg-gray-700 text-white rounded flex items-center justify-center text-[10px]">3</span>
                                        Data Retention &amp; Security
                                    </h4>
                                    <p className="ml-4">
                                        Data will be retained for the duration of the AI training project. We implement encryption,
                                        access controls, and secure cloud storage. You may request deletion at any time by contacting the Data Controller.
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-amber-800 font-semibold text-xs mb-1.5">Data Deletion &amp; Contact</p>
                                    <p className="text-amber-700 mb-2 text-xs">
                                        To request data deletion or exercise any of your rights under RA 10173, email:
                                    </p>
                                    <a
                                        href="mailto:mfostanes@ssct.edu.ph?subject=Data%20Deletion%20Request%20-%20Face%20Data%20Collector"
                                        className="inline-flex items-center gap-1.5 text-amber-900 font-mono text-xs bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 transition-colors"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        mfostanes@ssct.edu.ph
                                    </a>
                                    <p className="text-amber-600 text-[10px] mt-2">
                                        You may also file a complaint with the National Privacy Commission (NPC) at privacy.gov.ph
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Consent checkbox */}
                    <div className="mb-5 p-3.5 border-2 border-primary-200 rounded-xl bg-primary-50">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => setIsChecked(e.target.checked)}
                                    className="w-5 h-5 text-primary-600 border-2 border-primary-300 rounded focus:ring-primary-500 focus:ring-offset-0"
                                />
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
                                I have read and understood the above information. I <strong>voluntarily consent</strong> to the
                                collection and processing of my facial images for AI training purposes as described.
                                I understand my rights under the <strong className="text-primary-700">Data Privacy Act of 2012 (RA 10173)</strong> and
                                that I may withdraw my consent at any time.
                            </span>
                        </label>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onDecline}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        >
                            I Do Not Consent
                        </button>
                        <button
                            onClick={onConsent}
                            disabled={!isChecked}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isChecked
                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            I Consent &amp; Continue
                        </button>
                    </div>

                    {/* Age notice */}
                    <p className="mt-3 text-[11px] text-gray-400 text-center">
                        By consenting, you confirm you are 18+ or have parental/guardian consent.
                    </p>
                </div>
            </div>
        </div>
    );
}
