import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

/** Full-resolution photo viewer with zoom, close, and the contractor note. */
export function PhotoLightbox({
  src,
  note,
  caption,
  onClose,
}: {
  src: string;
  note?: string | null;
  caption?: string | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.25));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
    >
      <div
        className="flex items-center justify-end gap-2 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          className="rounded-full border border-white/25 p-2 text-white/80 transition-colors hover:border-white/60 hover:text-white"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-14 text-center text-xs text-white/70">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          className="rounded-full border border-white/25 p-2 text-white/80 transition-colors hover:border-white/60 hover:text-white"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="ml-2 rounded-full border border-white/25 p-2 text-white/80 transition-colors hover:border-white/60 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto px-4 pb-4">
        <img
          src={src}
          alt={note ?? "Property photo"}
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${zoom})` }}
          className="max-h-full max-w-full origin-center object-contain transition-transform duration-150"
        />
      </div>

      {(note || caption) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mx-auto mb-6 w-full max-w-3xl rounded-sm border border-white/15 bg-black/50 px-5 py-4"
        >
          {caption && (
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">{caption}</p>
          )}
          {note && (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{note}</p>
          )}
        </div>
      )}
    </div>
  );
}
