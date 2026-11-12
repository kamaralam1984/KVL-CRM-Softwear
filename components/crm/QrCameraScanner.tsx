"use client";
// Opens the laptop / phone camera and reads a QR code (or website barcode) held up to it.
// Calls onScan(text) once with the decoded text, then stops the camera.
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QrCameraScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, done = false;
    const stop = () => { done = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setErr("Camera needs HTTPS or localhost."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const v = videoRef.current!; v.srcObject = stream; await v.play();
        const tick = () => {
          if (done) return;
          const c = canvasRef.current!, ctx = c.getContext("2d", { willReadFrequently: true })!;
          if (v.readyState >= 2 && v.videoWidth) {
            c.width = v.videoWidth; c.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, c.width, c.height);
            const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
            if (code?.data) { stop(); onScan(code.data); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setErr(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission denied — allow it in the browser address bar." : "Could not open the camera."); }
    })();
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center text-sm text-white"><b>Scan QR code</b><button onClick={onClose} className="text-slate-400 hover:text-white">✕</button></div>
        {err ? <p className="text-rose-400 text-xs">{err}</p> : <p className="text-slate-400 text-xs">QR ko camera ke saamne rakho — apne aap detect ho jayega.</p>}
        <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
