import { useCallback, useEffect, useRef, useState } from "react";
import "./AvatarCrop.css";

// Square crop + resize, entirely client-side (no cropper dependency).
//
// The picked file is shown in a square viewport. The image is positioned with a
// translate + explicit pixel size, and the visible square is read back straight
// from that transform when exporting — so what you see is exactly what is drawn
// to the 256x256 canvas. The circular mask is only a guide: the exported image
// is square, and AvatarCircle shows it with object-fit: cover in a circle, so
// the inscribed circle you preview is precisely what appears in the avatar.
//
// Interaction supports mouse and touch through Pointer Events: one pointer
// drags, two pinch-zoom, the wheel zooms around the cursor, and arrow keys nudge
// (the slider handles zoom for keyboard/touch users).

const OUTPUT_SIZE = 256;
const QUALITY = 0.85;
const MAX_ZOOM = 4;
// Re-encode once at a lower quality if a WebP still lands over this.
const SOFT_MAX_BYTES = 100 * 1024;

function clampOffset(offset, scale, size, img) {
  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;
  const minX = Math.min(0, size - width);
  const minY = Math.min(0, size - height);
  return {
    x: Math.max(minX, Math.min(0, offset.x)),
    y: Math.max(minY, Math.min(0, offset.y)),
  };
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Draw the currently visible square into a 256x256 canvas and encode it.
// WebP is preferred; browsers that can't encode it silently hand back PNG, in
// which case JPEG is used instead.
async function renderSquare(img, scale, offset, size) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const source = size / scale;
  ctx.drawImage(
    img,
    -offset.x / scale,
    -offset.y / scale,
    source,
    source,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  let blob = await toBlob(canvas, "image/webp", QUALITY);
  if (!blob || blob.type !== "image/webp") {
    const jpeg = await toBlob(canvas, "image/jpeg", QUALITY);
    if (jpeg) blob = jpeg;
  }
  if (blob && blob.size > SOFT_MAX_BYTES) {
    const smaller = await toBlob(canvas, "image/jpeg", 0.72);
    if (smaller && smaller.size < blob.size) blob = smaller;
  }
  return blob;
}

export default function AvatarCrop({ file, onCancel, onConfirm }) {
  const [img, setImg] = useState(null);
  const [size, setSize] = useState(0);
  const [cover, setCover] = useState(0);
  const [scale, setScale] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const pointersRef = useRef(new Map());
  // Latest framing, read by the (stable) applyScale callback.
  const scaleRef = useRef(0);
  const offsetRef = useRef({ x: 0, y: 0 });
  const framedImgRef = useRef(null);
  const framedSizeRef = useRef(null);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Decode the picked file. onload/onerror is also the "is this really an
  // image?" check the brief calls for.
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    const image = new Image();
    let alive = true;
    image.onload = () => {
      if (!alive) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        setError("That image looks empty. Try a different file.");
        return;
      }
      setImg(image);
    };
    image.onerror = () => {
      if (alive) setError("That image couldn't be opened. Try a different file.");
    };
    image.src = url;
    return () => { alive = false; URL.revokeObjectURL(url); };
  }, [file]);

  // Measure the square viewport (it shrinks to fit small screens).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => setSize(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Frame the photo to cover the square, centred, whenever either changes.
  // (Synchronising with the measured viewport + decoded image, so an effect is
  // the right tool here.)
  useEffect(() => {
    if (!img || !size) return;
    const nextCover = size / Math.min(img.naturalWidth, img.naturalHeight);
    setCover(nextCover);
    setScale(nextCover);
    setOffset({
      x: (size - img.naturalWidth * nextCover) / 2,
      y: (size - img.naturalHeight * nextCover) / 2,
    });
  }, [img, size]);

  // Zoom so the pixel under `focal` stays put (viewport-centre when omitted).
  const applyScale = useCallback((target, focal) => {
    if (!img || !size) return;
    const current = scaleRef.current;
    if (!current) return;
    const next = Math.max(cover, Math.min(cover * MAX_ZOOM, target));
    const ratio = next / current;
    const point = focal || { x: size / 2, y: size / 2 };
    const from = offsetRef.current;
    setScale(next);
    setOffset(
      clampOffset(
        { x: point.x - (point.x - from.x) * ratio, y: point.y - (point.y - from.y) * ratio },
        next,
        size,
        img
      )
    );
  }, [img, size, cover]);

  // Wheel zoom needs a non-passive listener to preventDefault (page scroll).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!img) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      applyScale(scaleRef.current * (event.deltaY < 0 ? 1.12 : 1 / 1.12), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [img, applyScale]);

  // (Re)frame the photo to cover the square, centred, whenever the image or the
  // measured viewport changes. Done during render — guarded by refs so it runs
  // once per change — rather than in an effect, so no unframed frame is painted.
  if (img && size && (framedImgRef.current !== img || framedSizeRef.current !== size)) {
    framedImgRef.current = img;
    framedSizeRef.current = size;
    const nextCover = size / Math.min(img.naturalWidth, img.naturalHeight);
    setCover(nextCover);
    setScale(nextCover);
    setOffset({
      x: (size - img.naturalWidth * nextCover) / 2,
      y: (size - img.naturalHeight * nextCover) / 2,
    });
  }

  const onPointerDown = (event) => {
    if (!img) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale, offset };
      dragRef.current = null;
    }
  };

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2 && pinchRef.current && img) {
      const start = pinchRef.current;
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (!start.distance || !size) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const mid = {
        x: (points[0].x + points[1].x) / 2 - rect.left,
        y: (points[0].y + points[1].y) / 2 - rect.top,
      };
      const next = Math.max(cover, Math.min(cover * MAX_ZOOM, start.scale * (distance / start.distance)));
      const ratio = next / start.scale;
      setScale(next);
      setOffset(
        clampOffset(
          { x: mid.x - (mid.x - start.offset.x) * ratio, y: mid.y - (mid.y - start.offset.y) * ratio },
          next,
          size,
          img
        )
      );
      return;
    }

    if (dragRef.current && img) {
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      setOffset(
        clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, scale, size, img)
      );
    }
  };

  const onPointerUp = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  };

  // Arrow keys nudge the photo (Shift = larger step) for keyboard users.
  const onKeyDown = (event) => {
    if (!img) return;
    const step = event.shiftKey ? 24 : 8;
    const delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    setOffset((prev) => clampOffset({ x: prev.x + delta[0], y: prev.y + delta[1] }, scale, size, img));
  };

  const handleConfirm = async () => {
    if (!img || busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await renderSquare(img, scale, offset, size);
      if (!blob) throw new Error("Could not process that image. Try a different one.");
      onConfirm(blob);
    } catch (err) {
      setError(err?.message || "Could not process that image.");
      setBusy(false);
    }
  };

  const zoomValue = cover ? Math.min(MAX_ZOOM, Math.max(1, scale / cover)) : 1;

  return (
    <div className="avatar-crop">
      <div className="avatar-crop-header">
        <h2 className="avatar-crop-title">Adjust your photo</h2>
        <p className="avatar-crop-hint">Drag to reposition · pinch or slide to zoom</p>
      </div>

      {error && <div className="avatar-crop-error" role="alert">{error}</div>}

      <div
        ref={viewportRef}
        className="avatar-crop-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Crop preview. Drag or use the arrow keys to reposition, and use the slider to zoom."
      >
        {img && size > 0 && (
          <img
            className="avatar-crop-image"
            src={img.src}
            alt=""
            draggable={false}
            style={{
              width: img.naturalWidth * scale,
              height: img.naturalHeight * scale,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}
        <span className="avatar-crop-mask" aria-hidden="true" />
        {!img && !error && <span className="avatar-crop-spinner" aria-hidden="true" />}
      </div>

      <div className="avatar-crop-zoom">
        <button
          type="button"
          className="avatar-crop-zoom-btn"
          onClick={() => applyScale(scale / 1.25)}
          disabled={!img}
          aria-label="Zoom out"
        >
          −
        </button>
        <input
          type="range"
          className="avatar-crop-range"
          min="1"
          max={MAX_ZOOM}
          step="0.01"
          value={zoomValue}
          onChange={(event) => applyScale(cover * Number(event.target.value))}
          disabled={!img}
          aria-label="Zoom"
        />
        <button
          type="button"
          className="avatar-crop-zoom-btn"
          onClick={() => applyScale(scale * 1.25)}
          disabled={!img}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <div className="avatar-crop-footer">
        <button type="button" className="avatar-picker-btn" onClick={onCancel} disabled={busy}>
          Back
        </button>
        <button
          type="button"
          className="avatar-picker-btn avatar-picker-btn--primary"
          onClick={handleConfirm}
          disabled={!img || busy}
        >
          {busy ? "Processing…" : "Use photo"}
        </button>
      </div>
    </div>
  );
}
