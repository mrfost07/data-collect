/**
 * Upload API Route
 * 
 * POST /api/upload
 * 
 * Accepts image and metadata, uploads to Cloudinary.
 * 
 * SECURITY MEASURES:
 * - Upload token validation (HMAC-signed, server-only)
 * - Per-IP rate limiting (20 requests per 10 seconds)
 * - Request body size limit (2MB max)
 * - Input validation and sanitization
 * - Restricted CORS to known origins
 * - Error messages don't leak internal details
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadCapture, isCloudinaryConfigured } from '@/lib/cloudinary-upload';
import { verifyUploadToken } from '@/lib/upload-token';
import { CaptureMetadata, LabelType } from '@/types';

// Validate API key from environment (server-only, no NEXT_PUBLIC_ prefix)
const API_KEY = process.env.API_UPLOAD_KEY;

// Allowed origins for CORS (set via env or default to same-origin)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

// Valid label values to prevent injection
const VALID_LABELS: LabelType[] = [
    'looking_center', 'looking_down', 'looking_up',
    'looking_left', 'looking_right', 'no_face', 'with_cellphone',
];

// Max request body size (2MB — covers base64 image + metadata)
const MAX_BODY_SIZE = 2 * 1024 * 1024;

// --- Server-side Rate Limiting ---
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// NOTE: In-memory rate limiter — resets on serverless cold start (Vercel).
// Acceptable since Cloudinary has its own rate limiting.
// For stricter control, swap to Vercel KV or Upstash Redis.
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAX_REQUESTS = 20;   // 20 requests per window (Cloudinary is more generous)

function cleanupRateLimitMap(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    rateLimitMap.forEach((entry, key) => {
        if (now > entry.resetAt) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach((key) => rateLimitMap.delete(key));
    if (rateLimitMap.size > 10000) {
        rateLimitMap.clear();
    }
}

function isRateLimited(clientId: string): { limited: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    if (Math.random() < 0.1) cleanupRateLimitMap();

    let entry = rateLimitMap.get(clientId);
    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
        rateLimitMap.set(clientId, entry);
    }

    entry.count++;
    return {
        limited: entry.count > RATE_LIMIT_MAX_REQUESTS,
        remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count),
        resetAt: entry.resetAt,
    };
}

function getClientId(request: NextRequest): string {
    // Vercel provides request.ip automatically
    const vercelIp = (request as unknown as { ip?: string }).ip;
    if (vercelIp) return vercelIp;

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    return 'unknown';
}

// --- CORS helpers ---
function getCorsHeaders(request: NextRequest): Record<string, string> {
    const origin = request.headers.get('origin') || '';
    const isDev = process.env.NODE_ENV === 'development';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) ||
        (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1')));

    return {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        'Access-Control-Max-Age': '86400',
    };
}

// --- Validation ---
interface UploadRequestBody {
    imageBase64: string;
    metadata: CaptureMetadata;
}

function validateAuth(request: NextRequest): boolean {
    const providedKey = request.headers.get('x-api-key');
    if (!providedKey) return false;

    // Try signed upload token first
    if (verifyUploadToken(providedKey)) return true;

    // Fall back to raw API key
    if (!API_KEY) return false;
    if (providedKey.length !== API_KEY.length) return false;

    let result = 0;
    for (let i = 0; i < API_KEY.length; i++) {
        result |= providedKey.charCodeAt(i) ^ API_KEY.charCodeAt(i);
    }
    return result === 0;
}

function validateMetadata(metadata: unknown): metadata is CaptureMetadata {
    if (!metadata || typeof metadata !== 'object') return false;
    const m = metadata as Record<string, unknown>;
    if (!m.label || typeof m.label !== 'string') return false;
    if (!VALID_LABELS.includes(m.label as LabelType)) return false;
    if (m.phase !== 'A' && m.phase !== 'B') return false;
    if (typeof m.seq !== 'number' || m.seq < 0 || m.seq > 1000) return false;
    if (!m.timestamp_iso || typeof m.timestamp_iso !== 'string') return false;
    if (!m.session_id || typeof m.session_id !== 'string') return false;
    if (m.session_id.length > 50) return false;
    return true;
}

/**
 * POST handler for file uploads
 */
export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    // Check Cloudinary configuration
    if (!isCloudinaryConfigured()) {
        return NextResponse.json(
            { error: 'Upload service not configured' },
            { status: 503, headers: corsHeaders }
        );
    }

    // Validate auth
    if (!validateAuth(request)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: corsHeaders }
        );
    }

    // Check rate limit
    const clientId = getClientId(request);
    const rateCheck = isRateLimited(clientId);
    if (rateCheck.limited) {
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.', retryable: true },
            {
                status: 429,
                headers: {
                    ...corsHeaders,
                    'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
                },
            }
        );
    }

    try {
        // Check content-length
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
            return NextResponse.json(
                { error: 'Request body too large. Maximum 2MB allowed.' },
                { status: 413, headers: corsHeaders }
            );
        }

        const body: UploadRequestBody = await request.json();

        if (!body.imageBase64 || !body.metadata) {
            return NextResponse.json(
                { error: 'Missing required fields: imageBase64 and metadata' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (body.imageBase64.length > MAX_BODY_SIZE) {
            return NextResponse.json(
                { error: 'Image data too large' },
                { status: 413, headers: corsHeaders }
            );
        }

        if (!validateMetadata(body.metadata)) {
            return NextResponse.json(
                { error: 'Invalid metadata structure' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Upload to Cloudinary
        const result = await uploadCapture(body.imageBase64, body.metadata);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Upload failed. Please retry.', retryable: true },
                { status: 500, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Upload successful',
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Upload error:', error);

        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { error: 'An internal error occurred. Please retry.', retryable: true },
            { status: 500, headers: corsHeaders }
        );
    }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: getCorsHeaders(request),
    });
}
