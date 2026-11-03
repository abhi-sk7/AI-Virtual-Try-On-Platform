import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Camera,
  Upload,
  RefreshCw,
  Download,
  Bookmark,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { productService, tryonService, wardrobeService } from '../services/api';
import type { Product, TryOnJob } from '../types';
import { useAuth } from '../context/AuthContext';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export const TryOnPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'camera' ? 'camera' : 'photo';
  const initialProductId = searchParams.get('product') || '';

  const { isAuthenticated } = useAuth();

  const [mode, setMode] = useState<'photo' | 'camera'>(initialMode);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Photo mode states
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [polling, setPolling] = useState(false);
  const [wardrobeSaved, setWardrobeSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Camera mode states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [detectorLoading, setDetectorLoading] = useState(false);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const garmentImgRef = useRef<HTMLImageElement | null>(null);

  // Load products catalog
  useEffect(() => {
    productService
      .getProducts({ page_size: 50 })
      .then((res) => {
        setProducts(res.items);
        if (initialProductId) {
          const found = res.items.find((p) => p.id === initialProductId);
          if (found) setSelectedProduct(found);
        } else if (res.items.length > 0) {
          setSelectedProduct(res.items[0]);
        }
      })
      .catch(console.error);
  }, [initialProductId]);

  // Sync mode with URL
  const switchMode = (newMode: 'photo' | 'camera') => {
    setMode(newMode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newMode === 'camera') next.set('mode', 'camera');
      else next.delete('mode');
      return next;
    });
  };

  // Preload garment image element for 2D overlay
  useEffect(() => {
    if (selectedProduct?.images?.[0]) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = selectedProduct.images[0];
      img.onload = () => {
        garmentImgRef.current = img;
      };
    }
  }, [selectedProduct]);

  // Handle Photo selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Please select a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit.');
      return;
    }

    setUploadError('');
    setPersonFile(file);
    const url = URL.createObjectURL(file);
    setPersonPreview(url);
    setJob(null);
    setWardrobeSaved(false);
  };

  // Trigger AI virtual try-on
  const handleRunPhotoTryOn = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to submit a virtual try-on job.');
      return;
    }
    if (!personFile || !selectedProduct) {
      alert('Please select both a person photo and a garment.');
      return;
    }

    setUploadError('');
    try {
      const newJob = await tryonService.submitTryOn(personFile, selectedProduct.id);
      setJob(newJob);
      setPolling(true);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to submit try-on request.');
    }
  };

  // Poll for background AI inference job
  useEffect(() => {
    let interval: any;
    if (polling && job && ['queued', 'processing'].includes(job.status)) {
      interval = setInterval(async () => {
        try {
          const updated = await tryonService.getJobStatus(job.job_id);
          setJob(updated);
          if (['done', 'failed', 'unavailable'].includes(updated.status)) {
            setPolling(false);
          }
        } catch {
          setPolling(false);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [polling, job]);

  // Save to Wardrobe
  const handleSaveWardrobe = async () => {
    if (!job?.generated_image_url || !selectedProduct) return;
    try {
      await wardrobeService.saveToWardrobe(
        selectedProduct.id,
        job.generated_image_url,
        `AI fitting for ${selectedProduct.name}`
      );
      setWardrobeSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LIVE CAMERA & MEDIAPIPE POSE TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    if (mode === 'camera' && !poseLandmarker && !detectorLoading) {
      setDetectorLoading(true);
      FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
        .then((vision) =>
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          })
        )
        .then((landmarker) => {
          setPoseLandmarker(landmarker);
        })
        .catch((err) => {
          console.warn('GPU delegate failed, fallback to CPU', err);
          // Try CPU fallback
          FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          )
            .then((vision) =>
              PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath:
                    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                  delegate: 'CPU',
                },
                runningMode: 'VIDEO',
                numPoses: 1,
              })
            )
            .then(setPoseLandmarker)
            .catch((e) => setCameraError('Could not load pose tracker: ' + e.message));
        })
        .finally(() => setDetectorLoading(false));
    }
  }, [mode, poseLandmarker, detectorLoading]);

  // Start webcam
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Camera error: ' + (err.message || 'Device not accessible')
      );
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCameraActive(false);
  };

  // Real-time render loop with MediaPipe
  useEffect(() => {
    if (!cameraActive || !poseLandmarker || !videoRef.current || !canvasRef.current) return;

    let lastVideoTime = -1;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;

          // Set canvas dimensions to match video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Clear
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Run pose detection
          const startTimeMs = performance.now();
          const results = poseLandmarker.detectForVideo(video, startTimeMs);

          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];

            // MediaPipe Pose landmarks:
            // 11 = left shoulder, 12 = right shoulder
            const lShoulder = landmarks[11];
            const rShoulder = landmarks[12];

            if (lShoulder && rShoulder && garmentImgRef.current) {
              const lsX = lShoulder.x * canvas.width;
              const lsY = lShoulder.y * canvas.height;
              const rsX = rShoulder.x * canvas.width;
              const rsY = rShoulder.y * canvas.height;

              // Distance between shoulders
              const shoulderDist = Math.hypot(rsX - lsX, rsY - lsY);
              const angle = Math.atan2(rsY - lsY, rsX - lsX);

              // Center point between shoulders
              const midX = (lsX + rsX) / 2;
              const midY = (lsY + rsY) / 2;

              // Scale garment based on shoulder width (approx 2.2x shoulder width for natural drape)
              const garmentWidth = shoulderDist * 2.2;
              const aspectRatio = garmentImgRef.current.height / garmentImgRef.current.width;
              const garmentHeight = garmentWidth * aspectRatio;

              ctx.save();
              ctx.translate(midX, midY);
              ctx.rotate(angle);

              // Position slightly above the shoulder midpoint for neck opening
              const offsetY = garmentHeight * 0.15;
              ctx.drawImage(
                garmentImgRef.current,
                -garmentWidth / 2,
                -offsetY,
                garmentWidth,
                garmentHeight
              );

              ctx.restore();
            }
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, poseLandmarker]);

  // Capture snapshot from webcam + canvas
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = videoRef.current.videoWidth;
    mergeCanvas.height = videoRef.current.videoHeight;
    const mCtx = mergeCanvas.getContext('2d');
    if (!mCtx) return;

    // Draw video frame
    mCtx.drawImage(videoRef.current, 0, 0);
    // Draw garment overlay
    mCtx.drawImage(canvasRef.current, 0, 0);

    const dataUrl = mergeCanvas.toDataURL('image/jpeg', 0.95);
    setCapturedSnapshot(dataUrl);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Virtual Try-On Studio
            <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md uppercase">
              Pro
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose between high-precision photo diffusion or instantaneous webcam overlay.
          </p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => switchMode('photo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'photo'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mode 1: Photo AI
          </button>
          <button
            onClick={() => switchMode('camera')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'camera'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Mode 2: Live Camera
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left side: Viewport Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {mode === 'photo' ? (
            /* ── MODE 1: PHOTO WORKSPACE ── */
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Photo Diffusion Try-On
                </h2>
                {job?.status && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      job.status === 'done'
                        ? 'bg-emerald-100 text-emerald-700'
                        : job.status === 'processing'
                        ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                        : job.status === 'unavailable'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Status: {job.status}
                  </span>
                )}
              </div>

              {/* Before & After Viewport */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Photo */}
                <div className="h-96 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                  {personPreview ? (
                    <>
                      <img
                        src={personPreview}
                        alt="Your Upload"
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white shadow-sm transition">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer w-full h-full hover:bg-slate-100/50 transition">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-sm text-slate-800">
                        Upload Your Photo
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        Full-body or upper-body photo (JPG, PNG up to 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="absolute top-3 left-3 bg-slate-900/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                    Original
                  </span>
                </div>

                {/* AI Generated Result */}
                <div className="h-96 bg-slate-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden text-center p-6">
                  {job?.generated_image_url ? (
                    <>
                      <img
                        src={job.generated_image_url}
                        alt="Virtual Try-On Result"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <a
                          href={job.generated_image_url}
                          download={`tryon_${job.job_id}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-white/90 text-slate-800 rounded-lg hover:bg-white shadow-sm transition"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={handleSaveWardrobe}
                          disabled={wardrobeSaved}
                          className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition flex items-center gap-1"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          {wardrobeSaved ? 'Saved!' : 'Save Wardrobe'}
                        </button>
                      </div>
                    </>
                  ) : job?.status === 'processing' || job?.status === 'queued' ? (
                    <div className="space-y-3">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-white">Synthesizing Garment Folds...</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Running neural diffusion pipeline. This takes a few moments.
                      </p>
                    </div>
                  ) : job?.status === 'unavailable' ? (
                    <div className="space-y-2 p-4 bg-amber-950/60 border border-amber-800/80 rounded-xl text-left">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        AI Inference Engine Notice
                      </div>
                      <p className="text-xs text-amber-200/90 leading-relaxed">{job.message}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-slate-400">
                      <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs">Generated try-on outcome will render here.</p>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-indigo-600/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                    AI Result
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-500">
                  {selectedProduct && (
                    <span>
                      Selected:{' '}
                      <strong className="text-slate-800">{selectedProduct.name}</strong> ($
                      {selectedProduct.price})
                    </span>
                  )}
                </div>

                <button
                  onClick={handleRunPhotoTryOn}
                  disabled={!personFile || !selectedProduct || polling}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
                >
                  {polling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing AI Model...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Virtual Try-On
                    </>
                  )}
                </button>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          ) : (
            /* ── MODE 2: LIVE CAMERA WORKSPACE ── */
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Live 2D Garment Tracking
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time MediaPipe shoulder landmark alignment
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {cameraActive ? (
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
                    >
                      Stop Camera
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Start Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                {/* Real video feed */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    cameraActive ? 'block' : 'hidden'
                  }`}
                />

                {/* Tracking & Garment Overlay Canvas */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
                    cameraActive ? 'block' : 'hidden'
                  }`}
                />

                {!cameraActive && (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">Camera is inactive</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Click "Start Camera" to enable webcam pose tracking with automatic garment overlay.
                    </p>
                  </div>
                )}

                {/* Overlay Badge */}
                {cameraActive && (
                  <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Tracking 33 Landmarks
                  </div>
                )}
              </div>

              {/* Controls */}
              {cameraActive && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Stand roughly 1.5–2 meters from camera for best shoulder alignment.
                  </span>
                  <button
                    onClick={captureSnapshot}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Snapshot
                  </button>
                </div>
              )}

              {/* Snapshot Preview modal/card */}
              {capturedSnapshot && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Captured Snapshot</span>
                    <button
                      onClick={() => setCapturedSnapshot(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="h-64 rounded-xl overflow-hidden bg-slate-900">
                    <img
                      src={capturedSnapshot}
                      alt="Snapshot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <a
                      href={capturedSnapshot}
                      download="live_virtual_tryon.jpg"
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* AI Model Architecture & System Transparency Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Info className="w-4 h-4" />
              AI & Computer Vision Try-On Engine
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Photo Virtual Try-On</strong> utilizes an intelligent 33-point MediaPipe Pose landmark estimation pipeline with garment isolation, affine perspective warping, and photometric lighting harmonization. It runs smoothly on all hardware with instant rendering.
            </p>
            <p className="text-xs text-slate-400">
              <strong>Live Camera Mode</strong> executes client-side WebAssembly pose landmark tracking, anchoring garments directly onto shoulder and body keypoints in real time.
            </p>
          </div>
        </div>

        {/* Right side: Garment Picker (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Select Clothing Item</h3>
              <Link to="/catalog" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                    selectedProduct?.id === p.id
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase text-indigo-600">
                      {p.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                      ${p.price.toFixed(2)}
                    </p>
                  </div>

                  {selectedProduct?.id === p.id && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
