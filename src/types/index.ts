// Type definitions for the Face Data Collector application

export interface CaptureMetadata {
    label: LabelType;
    phase: 'A' | 'B';
    seq: number;
    timestamp_iso: string;
    ua: string;
    session_id: string;
    camera_facing: 'user' | 'environment';
    device_platform: string;
}

export type LabelType =
    | 'looking_center'
    | 'looking_down'
    | 'looking_up'
    | 'looking_left'
    | 'looking_right'
    | 'no_face'
    | 'with_cellphone';

export interface CaptureItem {
    id: string;
    imageBase64: string;
    metadata: CaptureMetadata;
    filename: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    retryCount: number;
    errorMessage?: string;
    driveFileId?: string;
}

export interface SessionState {
    sessionId: string;
    currentLabel: LabelType;
    currentPhase: 'A' | 'B';
    phaseCaptures: number;
    totalCaptures: number;
    isCapturing: boolean;
    isPaused: boolean;
    captures: CaptureItem[];
    withCellphone: boolean;
}

export interface DriveUploadResult {
    success: boolean;
    imageFileId?: string;
    metadataFileId?: string;
    error?: string;
}

export interface FolderCache {
    [path: string]: string; // path -> folderId
}

// MediaPipe FaceMesh types
export interface FaceLandmarks {
    x: number;
    y: number;
    z: number;
}

export interface FaceDetectionResult {
    detected: boolean;
    landmarks: FaceLandmarks[] | null;
    leftEyeBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    rightEyeBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

// Phase configuration
export const PHASE_CONFIG = {
    IMAGES_PER_PHASE: 50,
    PHASE_DURATION_MS: 10000,
    TOTAL_IMAGES: 100,
    CAPTURE_INTERVAL_MS: 200, // 10000ms / 50 images = 200ms
} as const;

// Label definitions with instructions
export const LABEL_INSTRUCTIONS: Record<LabelType, { eyesOnly: string; withFace: string }> = {
    looking_center: {
        eyesOnly: 'Keep your head facing the camera. Look straight ahead with your eyes.',
        withFace: 'Turn your head to face the camera directly.',
    },
    looking_down: {
        eyesOnly: 'Keep your head facing the camera. Look down with your eyes only.',
        withFace: 'Tilt your head down while looking at the camera.',
    },
    looking_up: {
        eyesOnly: 'Keep your head facing the camera. Look up with your eyes only.',
        withFace: 'Tilt your head up while looking at the camera.',
    },
    looking_left: {
        eyesOnly: 'Keep your head facing the camera. Look left with your eyes only.',
        withFace: 'Turn your head to the left.',
    },
    looking_right: {
        eyesOnly: 'Keep your head facing the camera. Look right with your eyes only.',
        withFace: 'Turn your head to the right.',
    },
    no_face: {
        eyesOnly: 'Move away from the camera so no face is visible.',
        withFace: 'Move away from the camera so no face is visible.',
    },
    with_cellphone: {
        eyesOnly: 'Hold your phone in view of the camera while looking at it.',
        withFace: 'Hold your phone in view of the camera.',
    },
};

// Folder structure for Google Drive
export const DRIVE_FOLDERS = [
    'looking_center/eyes_only',
    'looking_center/with_face',
    'looking_down/eyes_only',
    'looking_down/with_face',
    'looking_up/eyes_only',
    'looking_up/with_face',
    'looking_right/eyes_only',
    'looking_right/with_face',
    'looking_left/eyes_only',
    'looking_left/with_face',
    'no_face',
] as const;
