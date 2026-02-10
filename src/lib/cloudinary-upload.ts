/**
 * Cloudinary Upload Module
 * 
 * Uploads capture images and metadata to Cloudinary.
 * 
 * Folder structure in Cloudinary:
 *   face-data/{label}/
 *     img_{session}_{phase}_{seq}.jpg
 *     meta_{session}_{phase}_{seq}.json
 * 
 * All images for each label (both phases) are combined in one folder.
 */

import { v2 as cloudinary } from 'cloudinary';
import { CaptureMetadata } from '@/types';

// Configure Cloudinary from environment
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Sanitize folder/file names
function sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\-]/g, '_').trim();
}

/**
 * Build the folder path for a capture.
 * Flat structure: face-data/{label}/
 * No session_id or phase subdivision.
 */
function buildFolderPath(metadata: CaptureMetadata): string {
    const label = sanitizeName(metadata.label);
    return `face-data/${label}`;
}

/**
 * Upload a capture image + metadata to Cloudinary
 * Uses Promise.all for parallel upload of image and metadata JSON
 */
export async function uploadCapture(
    imageBase64: string,
    metadata: CaptureMetadata
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
        const folder = buildFolderPath(metadata);
        const sessionShort = metadata.session_id.substring(0, 8);
        const phase = metadata.phase === 'A' ? 'eyes' : 'face';
        const seq = String(metadata.seq).padStart(4, '0');
        const publicIdSuffix = `${sessionShort}_${phase}_${seq}`;

        // Strip data URL prefix if present
        const base64Data = imageBase64.includes(',')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`;

        // Prepare metadata as raw JSON
        const metaJson = JSON.stringify(metadata, null, 2);
        const metaBase64 = `data:application/json;base64,${Buffer.from(metaJson).toString('base64')}`;

        // Upload image + metadata in parallel
        const [imageResult] = await Promise.all([
            cloudinary.uploader.upload(base64Data, {
                folder,
                public_id: `img_${publicIdSuffix}`,
                resource_type: 'image',
                overwrite: true,
                tags: [
                    metadata.label,
                    `phase_${metadata.phase}`,
                    `session_${metadata.session_id}`,
                ],
                context: {
                    label: metadata.label,
                    phase: metadata.phase,
                    seq: String(metadata.seq),
                    session_id: metadata.session_id,
                    timestamp: metadata.timestamp_iso,
                    device: metadata.device_platform || 'unknown',
                },
            }),
            cloudinary.uploader.upload(metaBase64, {
                folder,
                public_id: `meta_${publicIdSuffix}`,
                resource_type: 'raw',
                overwrite: true,
            }),
        ]);

        return {
            success: true,
            imageUrl: imageResult.secure_url,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        console.error('Cloudinary upload error:', message);

        return {
            success: false,
            error: message,
        };
    }
}

/**
 * Check if Cloudinary is properly configured
 */
export function isCloudinaryConfigured(): boolean {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}
