/**
 * Upload Token API Route
 * 
 * GET /api/auth/upload-token
 * 
 * Returns a short-lived upload token for the client to use
 * when uploading images. This prevents exposing the raw API key
 * in the client-side JavaScript bundle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadToken } from '@/lib/upload-token';

const API_KEY = process.env.API_UPLOAD_KEY;

/**
 * GET handler — returns a fresh upload token
 */
export async function GET(request: NextRequest) {
    // Basic check that this is a same-origin request
    const referer = request.headers.get('referer') || '';
    const host = request.headers.get('host') || '';

    if (!referer.includes(host) && process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    if (!API_KEY) {
        return NextResponse.json(
            { error: 'Upload service not configured' },
            { status: 503 }
        );
    }

    try {
        const { token, expiresAt } = generateUploadToken();

        return NextResponse.json({
            token,
            expiresAt,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Token generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload token' },
            { status: 500 }
        );
    }
}
