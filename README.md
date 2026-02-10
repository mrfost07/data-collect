<div align="center">

<img src="public/logo.png" alt="CCIS CodeHub" width="80" />

# Face Data Collector

**AI Training Data Collection Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Cloud%20Storage-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-0097A7)](https://mediapipe.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

A production-ready web application for collecting labeled face images to train gaze direction recognition models. Built with Next.js, powered by Cloudinary for high-throughput cloud storage, and secured with HMAC-signed upload tokens.

[**Live Demo**](https://data-collect.vercel.app) · [**Report Bug**](https://github.com/mrfost07/data-collect/issues) · [**Request Feature**](https://github.com/mrfost07/data-collect/issues)

---

</div>

## Overview

Face Data Collector automates the process of capturing labeled facial images across **6 gaze directions** with two capture phases per direction. Images upload automatically to Cloudinary in the background, with offline retry via IndexedDB.

### Key Highlights

| Feature | Details |
|---------|---------|
| **Capture** | 100 images/session across 6 gaze directions, 2 phases each |
| **Storage** | Cloudinary cloud storage with parallel uploads |
| **Detection** | Real-time face mesh overlay via MediaPipe FaceMesh |
| **Security** | HMAC-signed tokens, server-side rate limiting, CORS protection |
| **Resilience** | Auto-recovery on camera disconnect, IndexedDB offline queue |
| **Compliance** | Philippine Data Privacy Act (RA 10173) consent flow |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser Client                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Camera   │  │ FaceMesh │  │   Upload Queue    │  │
│  │  Stream   │──│ Overlay  │  │  (IndexedDB +     │  │
│  │          │  │          │  │   retry logic)    │  │
│  └──────────┘  └──────────┘  └─────────┬─────────┘  │
└──────────────────────────────────────────┼──────────┘
                                          │ HTTPS + HMAC Token
                                          ▼
┌─────────────────────────────────────────────────────┐
│                  Next.js API Routes                  │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Token Auth   │  │  Rate    │  │  Cloudinary   │  │
│  │ (HMAC-SHA256)│  │ Limiter  │  │   Upload      │  │
│  └──────────────┘  └──────────┘  └───────┬───────┘  │
└──────────────────────────────────────────┼──────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Cloudinary   │
                                   │  Media Cloud  │
                                   └──────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- A free [Cloudinary](https://cloudinary.com/) account

### Installation

```bash
# Clone the repository
git clone https://github.com/mrfost07/data-collect.git
cd data-collect

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configuration

Edit `.env.local` with your credentials:

```env
# Upload authentication (generate a random string)
API_UPLOAD_KEY=your-random-api-key-here

# Cloudinary (Dashboard → Settings → Access Keys)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS origins (comma-separated, for production)
ALLOWED_ORIGINS=https://your-app.vercel.app
```

> **Tip:** Generate a secure API key with `openssl rand -hex 32` or any password generator.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Cloudinary Storage Structure

Images are organized automatically by session, label, and phase:

```
face-data/
└── {session_id}/
    ├── looking_center/
    │   ├── eyes_only/
    │   │   ├── img_0001.jpg
    │   │   └── meta_0001.json
    │   └── with_face/
    │       ├── img_0001.jpg
    │       └── meta_0001.json
    ├── looking_up/
    │   ├── eyes_only/
    │   └── with_face/
    ├── looking_down/ ...
    ├── looking_left/ ...
    ├── looking_right/ ...
    ├── no_face/
    │   ├── img_0001.jpg
    │   └── meta_0001.json
    └── with_cellphone/
        ├── img_0001.jpg
        └── meta_0001.json
```

---

## Deployment on Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/mrfost07/data-collect.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `data-collect` repository
3. Add environment variables (see table below)
4. Click **Deploy**

### 3. Environment Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `API_UPLOAD_KEY` | Your upload authentication key |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `ALLOWED_ORIGINS` | Your production URL (e.g., `https://data-collect.vercel.app`) |

### 4. Post-Deployment

- Verify the upload flow by running a test capture session
- Check the [Cloudinary Media Library](https://console.cloudinary.com/console/media_library) for uploaded images
- Monitor the Vercel function logs for any errors

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/upload-token/route.ts   # Token generation endpoint
│   │   └── upload/route.ts              # Upload API (Cloudinary)
│   ├── globals.css                      # Global styles
│   ├── layout.tsx                       # Root layout
│   └── page.tsx                         # Landing page
├── components/
│   ├── CameraView.tsx                   # Camera display + overlays
│   ├── CaptureSession.tsx               # Session controller
│   ├── ConsentModal.tsx                 # Privacy consent dialog
│   ├── CountdownOverlay.tsx             # Pre-capture countdown
│   ├── FaceOverlay.tsx                  # Face mesh visualization
│   ├── ProgressIndicator.tsx            # Session progress
│   └── UploadStatus.tsx                 # Upload queue status
├── hooks/
│   ├── useCamera.ts                     # Camera access + auto-recovery
│   ├── useFaceMesh.ts                   # MediaPipe FaceMesh
│   └── useUploadQueue.ts               # Upload queue with retry
├── lib/
│   ├── cloudinary-upload.ts             # Cloudinary upload module
│   ├── indexed-db.ts                    # IndexedDB offline storage
│   └── upload-token.ts                  # HMAC token generation
└── types/
    └── index.ts                         # TypeScript type definitions
```

---

## Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | HMAC-SHA256 signed upload tokens (short-lived, with nonce) |
| **Rate Limiting** | Server-side IP-based throttling (20 req/10s) |
| **CORS** | Origin whitelist via `ALLOWED_ORIGINS` |
| **Input Validation** | Metadata schema validation, 2MB body size limit |
| **API Key** | Server-only `API_UPLOAD_KEY`, never exposed to client |
| **Transport** | HTTPS enforced (camera API requires secure context) |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org/) | Full-stack React framework |
| [TypeScript](https://typescriptlang.org/) | Type safety |
| [Cloudinary](https://cloudinary.com/) | Image and metadata storage |
| [MediaPipe FaceMesh](https://mediapipe.dev/) | Real-time face detection |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Offline queue persistence |

---

## License

MIT License — [CCIS CodeHub Platform](https://ccis-codehub.space)

**Developer:** Mark Renier B. Fostanes
