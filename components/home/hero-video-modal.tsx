import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
  srcWebm?: string | undefined;
  poster?: string;
  title: string;
  description: string;
};

/** Full-screen video player for the hero: play/pause control plus a close button. */
export function HeroVideoModal({ open, onClose, src, srcWebm, poster, title, description }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void videoRef.current?.play().catch(() => undefined);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
      setPlaying(false);
      setFailed(false);
    }
  }, [open, src]);

  if (!open) return null;

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/92 p-4 backdrop-blur-md sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface/60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full border border-border bg-background/80 text-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <X className="size-4" />
        </button>

        <div className="relative aspect-video w-full bg-black">
          {failed ? (
            <div className="grid size-full place-items-center px-6 text-center">
              <p className="text-sm text-muted-foreground">
                This video isn’t available yet. Upload it to the site and set the file in the site
                editor.
              </p>
            </div>
          ) : (
            <video
              key={`${src}|${srcWebm ?? ""}`}
              ref={videoRef}
              poster={poster || undefined}
              controls
              playsInline
              preload="auto"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={(event) => {
                // A failing <source> also surfaces here; only give up when no
                // source at all could be played.
                if (event.target !== videoRef.current) return;
                if (videoRef.current?.error) setFailed(true);
              }}
              className="size-full object-contain"
            >
              {src && <source src={src} type={src.includes(".webm") ? "video/webm" : "video/mp4"} />}
              {srcWebm && <source src={srcWebm} type="video/webm" />}
              <track kind="captions" />
            </video>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h3 className="font-display text-xl">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          {!failed && (
            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {playing ? "Pause" : "Play"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
