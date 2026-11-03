# AuraFit AI — Virtual Fashion Try-On Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.162-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_TypeScript-61DAFB.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC.svg)](https://tailwindcss.com)
[![MediaPipe](https://img.shields.io/badge/Pose_Tracking-Google_MediaPipe-4285F4.svg)](https://developers.google.com/mediapipe)
[![Diffusion](https://img.shields.io/badge/AI_Engine-IDM--VTON_Ready-7928CA.svg)](https://github.com/yisol/IDM-VTON)

> A modern, commercial-ready fashion e-commerce web platform integrating deep learning neural diffusion for photo-based virtual try-on, client-side MediaPipe landmark computer vision for real-time webcam garment fitting, intelligent biometric size recommendations, and complete administrative control.

---

## 1. System Architecture

```mermaid
flowchart TD
    User["Web Browser / Client"]
    Vite["React 19 + TypeScript + Tailwind (Port 5173)"]
    MediaPipe["MediaPipe Pose Landmarker (WASM/WebGL)"]
    FastAPI["FastAPI REST Backend (Port 8000)"]
    DB[("MongoDB / AsyncMongoMock")]
    Storage["Local / Cloud Object Storage"]
    AIService["IDM-VTON Diffusion Service"]

    User -->|Interacts| Vite
    Vite -->|Client-side 33 Keypoint Tracking| MediaPipe
    Vite -->|API Requests & Image Uploads| FastAPI
    FastAPI -->|JWT & Data Persistence| DB
    FastAPI -->|Static File Serving| Storage
    FastAPI -->|Background Inference Tasks| AIService
```

### Key Modules & Capabilities

1. **Dual Try-On Engines**:
   - **Mode 1 (Photo Virtual Try-On)**: Upload personal photograph (JPG, PNG, WEBP), select catalog garment, and trigger background neural diffusion job. Includes polling, before/after side-by-side view, download, and wardrobe saving.
   - **Mode 2 (Live Camera Try-On)**: In-browser 33-point MediaPipe pose estimation with acromioclavicular shoulder alignment, rotation angle, scaling, and snapshot capture.
2. **Product Catalog & Filters**:
   - Search by keyword, brand, category, garment type, size, and price.
   - Categorized by Upper Body, Lower Body, Full Body, and Accessories.
3. **Smart Size Recommendation**:
   - Computes recommended fit (XS–XXL) based on height, weight, chest, waist, hip, and fit cut preferences (slim, regular, relaxed).
4. **User Wardrobe & Favorites**:
   - Saved outfits gallery, favorites bookmarking, and chronological try-on audit log.
5. **Admin Operations Dashboard**:
   - Platform analytics (users, inventory, try-on throughput, success/failure metrics).
   - Real-time garment publishing with direct image upload.

---

## 2. Default Credentials & Running Ports

| Service | Address | Default Credentials |
|---------|---------|---------------------|
| **Frontend** | [http://127.0.0.1:5173](http://127.0.0.1:5173) | — |
| **Backend API** | [http://127.0.0.1:8000](http://127.0.0.1:8000) | — |
| **API Docs (Swagger)** | [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs) | — |
| **Default Administrator** | Sign in via `/login` | `admin@virtualtryon.ai` / `AdminPass123!` |

---

## 3. Quick Start Guide (Windows)

### Prerequisites
- **Node.js**: v18+ (tested on Node.js 24)
- **Python**: 3.10+ (tested on Python 3.14)
- **MongoDB**: (Optional) MongoDB local or Atlas. If no live MongoDB instance is reachable, the backend activates a built-in async in-memory document store automatically.

### Step 1: Start Backend
```powershell
cd "d:\tmp\3d model\backend"
$env:PYTHONPATH="."
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```

### Step 2: Start Frontend
```powershell
cd "d:\tmp\3d model\frontend"
npm run dev -- --host 127.0.0.1 --port 5173
```
Visit **http://127.0.0.1:5173** in your browser.

---

## 4. Hardware & AI Model Requirements

### Photo Virtual Try-On (IDM-VTON)
- **Recommended Hardware**: NVIDIA GPU with minimum 8 GB–16 GB VRAM with CUDA 12.x.
- **CPU Fallback Behavior**: To protect servers from catastrophic 60-minute blocking CPU bottlenecks, the backend returns a clean, transparent `503 Unavailable` status stating GPU requirement rather than presenting fabricated dummy outputs.
- To enable full GPU diffusion inference:
  ```powershell
  pip install diffusers transformers accelerate torch torchvision --index-url https://download.pytorch.org/whl/cu121
  ```
  And set in `.env`:
  ```ini
  AI_MODEL=idm_vton
  AI_MODEL_DEVICE=cuda
  HUGGINGFACE_TOKEN=your_token_here
  ```

### Live Camera Mode
- Completely client-side WebAssembly / WebGL via Google MediaPipe Tasks Vision. Runs natively on modern mobile and desktop browsers with zero backend GPU load.

---

## 5. Automated Testing

Run the automated backend test suite:
```powershell
python -m pytest tests/backend/test_api.py -v
```
To run frontend production build verification:
```powershell
cd "d:\tmp\3d model\frontend"
npm run build
```
