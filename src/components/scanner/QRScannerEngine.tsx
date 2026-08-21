"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, AlertCircle, RefreshCw } from "lucide-react";

interface QRScannerEngineProps {
  onScan: (qrToken: string) => void;
  isPaused: boolean;
  disabled?: boolean;
}

export default function QRScannerEngine({
  onScan,
  isPaused,
  disabled = false,
}: QRScannerEngineProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Track latest isPaused/disabled in refs so the requestAnimationFrame loop always reads fresh state
  const isPausedRef = useRef(isPaused);
  const disabledRef = useRef(disabled);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setHasPermission(true);
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Camera access failure:", err);
      setHasPermission(false);
      setIsInitializing(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera access was denied. Please grant camera permissions in your browser settings to scan QR codes.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No video camera device detected on this workstation.");
      } else {
        setErrorMessage(err.message || "Failed to initialize camera video stream.");
      }
    }
  }, [facingMode]);

  // Frame scanning loop
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (
      video.readyState === video.HAVE_ENOUGH_DATA &&
      !isPausedRef.current &&
      !disabledRef.current &&
      ctx
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (imageData && imageData.data) {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && code.data.trim().length > 0) {
          const rawToken = code.data.trim();
          // Notify parent of detected QR token
          onScanRef.current(rawToken);
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, []);

  useEffect(() => {
    startCamera();

    // Start scan loop
    animationFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera, scanFrame]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-video bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      />

      {/* Viewfinder Target Reticle Overlay */}
      {hasPermission && !isInitializing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Target Reticle Box */}
          <div
            className={`w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border-2 transition-all duration-300 relative ${
              isPaused
                ? "border-amber-400/80 bg-amber-500/10"
                : "border-emerald-400/90 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
            }`}
          >
            {/* Corner Accent Brackets */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

            {/* Laser scanning bar animation when active */}
            {!isPaused && (
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Scanner Status Badge Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div
              className={`px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg flex items-center gap-2 ${
                isPaused
                  ? "bg-amber-900/80 text-amber-200 border-amber-500/50"
                  : "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isPaused ? "bg-amber-400" : "bg-emerald-400 animate-ping"
                }`}
              />
              <span>{isPaused ? "Scanner Paused — Result Active" : "Waiting for Student QR..."}</span>
            </div>
          </div>

          {/* Camera Flip Switch Button */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            title="Switch Camera (Front/Back)"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur border border-white/20 transition-all pointer-events-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State Overlay */}
      {isInitializing && (
        <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center text-white space-y-3">
          <Camera className="w-8 h-8 text-blue-400 animate-pulse" />
          <p className="text-sm font-medium text-gray-300">Initializing camera feed...</p>
        </div>
      )}

      {/* Error / Permission Denied State Overlay */}
      {hasPermission === false && (
        <div className="absolute inset-0 bg-gray-950 p-6 flex flex-col items-center justify-center text-center text-white space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <CameraOff className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-bold text-base text-gray-100">Camera Unavailable</h3>
            <p className="text-xs text-gray-400">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={startCamera}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Camera Access</span>
          </button>
        </div>
      )}
    </div>
  );
}
