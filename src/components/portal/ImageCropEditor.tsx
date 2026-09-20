"use client";

import { Check, Crop, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const OUTPUT_SIZE = 1200;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cropGeometry(width: number, height: number, zoom: number, x: number, y: number) {
  const size = Math.min(width, height) / zoom;
  const maxX = Math.max(0, (width - size) / 2);
  const maxY = Math.max(0, (height - size) / 2);
  return {
    sx: clamp((width - size) / 2 + (x / 100) * maxX, 0, Math.max(0, width - size)),
    sy: clamp((height - size) / 2 + (y / 100) * maxY, 0, Math.max(0, height - size)),
    size,
  };
}

function drawCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  zoom: number,
  x: number,
  y: number,
  outputSize: number,
) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return false;
  const { sx, sy, size } = cropGeometry(image.naturalWidth, image.naturalHeight, zoom, x, y);
  canvas.width = outputSize;
  canvas.height = outputSize;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#081426";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(image, sx, sy, size, size, 0, 0, outputSize, outputSize);
  return true;
}

export function ImageCropEditor({
  file,
  title,
  onCancel,
  onConfirm,
}: {
  file: File;
  title: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = previewRef.current;
    if (!ready || !image || !canvas) return;
    drawCrop(canvas, image, zoom, x, y, 720);
  }, [ready, source, zoom, x, y]);

  const reset = () => {
    setZoom(1);
    setX(0);
    setY(0);
    setError(null);
  };

  const confirm = async () => {
    const image = imageRef.current;
    if (!image || !ready || working) return;
    setWorking(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      if (!drawCrop(canvas, image, zoom, x, y, OUTPUT_SIZE)) throw new Error("Canvas nicht verfügbar.");
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
      if (!blob) throw new Error("Das Bild konnte nicht erstellt werden.");
      if (blob.size > 5 * 1024 * 1024) throw new Error("Das zugeschnittene Bild ist zu groß.");
      const base = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "profilbild";
      onConfirm(new File([blob], `${base}-1200x1200.webp`, { type: "image/webp", lastModified: Date.now() }));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Das Bild konnte nicht zugeschnitten werden.");
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[#020712]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#081426] text-white shadow-[0_36px_100px_-32px_rgba(0,0,0,.9)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-electric-soft"><Crop className="h-4 w-4" /> Bildeditor</p>
            <h2 id="image-crop-title" className="mt-1 text-[20px] font-extrabold">{title}</h2>
            <p className="mt-1 text-[12px] text-silver">Endformat: 1200 × 1200 px · 1:1 · WebP</p>
          </div>
          <button type="button" onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-silver hover:bg-white/10 hover:text-white" aria-label="Bildeditor schließen"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="mx-auto w-full max-w-[620px]">
            <div className="relative aspect-square overflow-hidden rounded-[24px] border border-white/10 bg-black/25">
              {source && <img ref={imageRef} src={source} alt="" className="hidden" onLoad={() => setReady(true)} onError={() => setError("Das Bild konnte nicht gelesen werden.")} />}
              <canvas ref={previewRef} className="h-full w-full" aria-label="Vorschau des zugeschnittenen Bildes" />
              <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/15" />
              <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/15" />
              <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/15" />
              <div className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-white/15" />
              <div className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-white/15" />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="crop-zoom" className="flex items-center justify-between text-[12.5px] font-bold text-platinum"><span>Zoom</span><span>{zoom.toFixed(2)}×</span></label>
              <input id="crop-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-electric" />
            </div>
            <div>
              <label htmlFor="crop-x" className="flex items-center justify-between text-[12.5px] font-bold text-platinum"><span>Horizontal</span><span>{x}</span></label>
              <input id="crop-x" type="range" min="-100" max="100" step="1" value={x} onChange={(event) => setX(Number(event.target.value))} className="mt-2 w-full accent-electric" />
            </div>
            <div>
              <label htmlFor="crop-y" className="flex items-center justify-between text-[12.5px] font-bold text-platinum"><span>Vertikal</span><span>{y}</span></label>
              <input id="crop-y" type="range" min="-100" max="100" step="1" value={y} onChange={(event) => setY(Number(event.target.value))} className="mt-2 w-full accent-electric" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[11.5px] leading-relaxed text-silver">
              Positioniere das Gesicht möglichst im mittleren Drittel. Der sichtbare Ausschnitt entspricht dem Bild, das später in allen Profilflächen verwendet wird.
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-200">{error}</p>}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button type="button" onClick={reset} disabled={working} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] font-bold text-white hover:bg-white/10 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Zurücksetzen</button>
              <button type="button" onClick={() => void confirm()} disabled={!ready || working} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-electric text-[13px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-50"><Check className="h-4 w-4" /> {working ? "Wird zugeschnitten…" : "Zuschnitt übernehmen"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
