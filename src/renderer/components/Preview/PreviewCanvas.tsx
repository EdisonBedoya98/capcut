import React, { useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';

// ============================================================
// Media cache: reuse <video> / <img> elements across renders
// ============================================================
const mediaCache = new Map<string, HTMLVideoElement | HTMLImageElement>();
// Track which videos have had user-interaction-gated unmute
const userInteracted = { value: false };

// Listen once for any user gesture so we can unmute videos
if (typeof window !== 'undefined') {
  const markInteraction = () => { userInteracted.value = true; };
  window.addEventListener('click', markInteraction, { once: true });
  window.addEventListener('keydown', markInteraction, { once: true });
}

function getOrCreateMedia(
  sourceFile: string,
  type: 'video' | 'image',
): HTMLVideoElement | HTMLImageElement | null {
  if (!sourceFile) return null;
  if (mediaCache.has(sourceFile)) return mediaCache.get(sourceFile)!;

  if (type === 'video') {
    const video = document.createElement('video');
    video.src = sourceFile;
    video.preload = 'auto';
    video.playsInline = true;
    // Start muted so first play() never fails, unmute after user gesture
    video.muted = !userInteracted.value;
    video.volume = 1;
    mediaCache.set(sourceFile, video);
    return video;
  } else {
    const img = new Image();
    img.src = sourceFile;
    mediaCache.set(sourceFile, img);
    return img;
  }
}

// ============================================================
// Component
// ============================================================
export const PreviewCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // We read the store *imperatively* inside the rAF loop
  // to avoid re-creating callbacks on every Zustand update.
  const storeRef = useRef(useProjectStore.getState());

  // Keep storeRef up-to-date (cheap – just a ref assignment)
  useEffect(() => {
    const unsub = useProjectStore.subscribe((s) => {
      storeRef.current = s;
    });
    return unsub;
  }, []);

  // We still subscribe to a few values for the JSX (transport controls)
  const {
    project,
    currentTime,
    isPlaying,
    playbackRate,
    setCurrentTime,
    togglePlayback,
    setPlaybackRate,
  } = useProjectStore();

  // ----- Sync video elements to the timeline -----
  const syncVideos = useCallback(() => {
    const s = storeRef.current;
    const ct = s.currentTime;

    // Collect currently-visible source files
    const visibleSources = new Set<string>();

    for (const track of s.project.tracks) {
      if (!track.visible) continue;
      for (const clip of track.clips) {
        if (clip.type !== 'video' || !clip.sourceFile) continue;
        if (ct < clip.startTime || ct >= clip.startTime + clip.duration) continue;

        visibleSources.add(clip.sourceFile);
        const video = getOrCreateMedia(clip.sourceFile, 'video') as HTMLVideoElement | null;
        if (!video) continue;

        // Unmute after user interaction
        if (userInteracted.value && video.muted) {
          video.muted = false;
        }

        // Set volume from track
        video.volume = track.volume;

        const clipLocal = ct - clip.startTime + clip.sourceOffset;

        if (s.isPlaying) {
          video.playbackRate = s.playbackRate;
          // Seek only if drift > 0.3s (let the native player handle smooth playback)
          if (Math.abs(video.currentTime - clipLocal) > 0.3) {
            video.currentTime = clipLocal;
          }
          if (video.paused) {
            video.play().catch(() => {});
          }
        } else {
          if (!video.paused) video.pause();
          // When paused, seek precisely for scrubbing
          if (Math.abs(video.currentTime - clipLocal) > 0.05) {
            video.currentTime = clipLocal;
          }
        }
      }
    }

    // Pause any videos that are no longer visible
    mediaCache.forEach((media, src) => {
      if (media instanceof HTMLVideoElement && !visibleSources.has(src) && !media.paused) {
        media.pause();
      }
    });
  }, []);

  // ----- Draw one frame to the canvas -----
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = storeRef.current;
    const { width, height } = s.project.resolution;
    const ct = s.currentTime;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    for (const track of s.project.tracks) {
      if (!track.visible) continue;
      for (const clip of track.clips) {
        if (ct < clip.startTime || ct >= clip.startTime + clip.duration) continue;

        ctx.save();
        ctx.globalAlpha = clip.opacity;

        const cx = width * (0.5 + clip.transform.x);
        const cy = height * (0.5 + clip.transform.y);
        ctx.translate(cx, cy);
        ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        ctx.scale(clip.transform.scaleX, clip.transform.scaleY);

        // ---- TEXT / CAPTION ----
        if (clip.type === 'text' && clip.text) {
          const t = clip.text;
          ctx.font = `${t.fontStyle} ${t.fontWeight} ${t.fontSize}px ${t.fontFamily}`;
          ctx.textAlign = t.textAlign;
          ctx.textBaseline = 'middle';

          const lines = t.content.split('\n');
          const lh = t.fontSize * t.lineHeight;
          const totalH = lines.length * lh;
          const startY = -totalH / 2 + lh / 2;

          if (t.backgroundOpacity > 0) {
            const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
            ctx.fillStyle = t.backgroundColor;
            ctx.globalAlpha = clip.opacity * t.backgroundOpacity;
            const bgX = t.textAlign === 'center' ? -maxW / 2 - 12 : -12;
            ctx.fillRect(bgX, -totalH / 2 - 8, maxW + 24, totalH + 16);
            ctx.globalAlpha = clip.opacity;
          }

          lines.forEach((line, i) => {
            const y = startY + i * lh;
            if (t.shadowBlur > 0) {
              ctx.shadowColor = t.shadowColor;
              ctx.shadowBlur = t.shadowBlur;
              ctx.shadowOffsetX = t.shadowOffsetX;
              ctx.shadowOffsetY = t.shadowOffsetY;
            }
            if (t.strokeWidth > 0) {
              ctx.strokeStyle = t.strokeColor;
              ctx.lineWidth = t.strokeWidth;
              ctx.lineJoin = 'round';
              ctx.strokeText(line, 0, y);
            }
            ctx.fillStyle = t.color;
            ctx.fillText(line, 0, y);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          });

        // ---- VIDEO / IMAGE with source ----
        } else if ((clip.type === 'video' || clip.type === 'image') && clip.sourceFile) {
          const mType = clip.type === 'video' ? 'video' : 'image';
          const media = getOrCreateMedia(clip.sourceFile, mType);

          if (media) {
            const ready =
              media instanceof HTMLVideoElement
                ? media.readyState >= 2
                : (media as HTMLImageElement).complete && (media as HTMLImageElement).naturalWidth > 0;

            if (ready) {
              const natW = media instanceof HTMLVideoElement ? media.videoWidth : (media as HTMLImageElement).naturalWidth;
              const natH = media instanceof HTMLVideoElement ? media.videoHeight : (media as HTMLImageElement).naturalHeight;

              if (natW > 0 && natH > 0) {
                const scale = Math.max(width / natW, height / natH);
                const dw = natW * scale;
                const dh = natH * scale;
                try {
                  ctx.drawImage(media, -dw / 2, -dh / 2, dw, dh);
                } catch {
                  drawPlaceholder(ctx, width, height, clip.color, clip.name);
                }
              } else {
                drawPlaceholder(ctx, width, height, clip.color, clip.name + ' (loading...)');
              }
            } else {
              drawPlaceholder(ctx, width, height, clip.color, clip.name + ' (loading...)');
            }
          } else {
            drawPlaceholder(ctx, width, height, clip.color, clip.name);
          }

          // Selection handles
          if (clip.id === s.selectedClipId) {
            const hs = 10;
            ctx.fillStyle = '#e94560';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (const [hx, hy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
              const px = (hx * width) / 2 - hs / 2;
              const py = (hy * height) / 2 - hs / 2;
              ctx.fillRect(px, py, hs, hs);
              ctx.strokeRect(px, py, hs, hs);
            }
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(-width / 2, -height / 2, width, height);
            ctx.setLineDash([]);
          }

        // ---- placeholder (no source) ----
        } else if (clip.type === 'video' || clip.type === 'image') {
          drawPlaceholder(ctx, width, height, clip.color, clip.name);
        }

        ctx.restore();
      }
    }

    // Timecode overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(width - 130, 8, 122, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const mins = Math.floor(ct / 60);
    const secs = Math.floor(ct % 60);
    const frames = Math.floor((ct % 1) * s.project.fps);
    ctx.fillText(
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`,
      width - 16,
      22,
    );
    ctx.restore();
  }, []);

  // ============================================================
  // MAIN RENDER LOOP – runs purely via rAF, no React re-renders
  // ============================================================
  useEffect(() => {
    let running = true;
    let lastTs = 0;

    const tick = (now: number) => {
      if (!running) return;

      const s = storeRef.current;

      // If playing, advance currentTime from real elapsed time
      if (s.isPlaying && lastTs > 0) {
        const delta = (now - lastTs) / 1000;
        const next = s.currentTime + delta * s.playbackRate;
        const maxDur = s.getProjectDuration();
        if (next >= maxDur) {
          s.setCurrentTime(0);
        } else {
          s.setCurrentTime(next);
        }
      }
      lastTs = now;

      syncVideos();
      drawFrame();

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [syncVideos, drawFrame]);

  // Resize canvas when resolution changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = project.resolution.width;
    canvas.height = project.resolution.height;
  }, [project.resolution.width, project.resolution.height]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview header */}
      <div className="px-3 py-2 border-b border-editor-border flex items-center justify-between bg-editor-surface/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-editor-muted">Preview</span>
        <span className="text-xs text-editor-muted font-mono">
          {formatTime(currentTime)} / {formatTime(useProjectStore.getState().getProjectDuration())}
        </span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-black/50 overflow-hidden p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full rounded shadow-2xl"
          style={{
            aspectRatio: `${project.resolution.width}/${project.resolution.height}`,
            maxHeight: '100%',
            maxWidth: '100%',
            width: 'auto',
            height: 'auto',
          }}
        />
      </div>

      {/* Transport Controls - CapCut style */}
      <div className="px-4 py-1.5 border-t border-editor-border bg-editor-surface flex items-center justify-between">
        {/* Left: timecodes */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-editor-accent">{formatTimecode(currentTime, project.fps)}</span>
          <span className="text-xs font-mono text-editor-muted">{formatTimecode(useProjectStore.getState().getProjectDuration(), project.fps)}</span>
        </div>

        {/* Center: play button */}
        <button
          onClick={togglePlayback}
          className="p-1.5 rounded hover:bg-editor-panel text-editor-muted hover:text-editor-text transition-colors"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Right: tools */}
        <div className="flex items-center gap-1">
          <button className="px-2 py-0.5 text-[10px] text-editor-muted border border-editor-border rounded hover:bg-editor-panel" title="Full screen">Full</button>
          <button className="px-2 py-0.5 text-[10px] text-editor-muted border border-editor-border rounded hover:bg-editor-panel" title="Ratio">Ratio</button>
          {/* Volume */}
          <div className="flex items-center gap-1 ml-1" title="Volume">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-editor-muted">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <input type="range" min="0" max="1" step="0.05" defaultValue="1"
              onChange={(e) => { const vol = parseFloat(e.target.value); mediaCache.forEach((m) => { if (m instanceof HTMLVideoElement) m.volume = vol; }); }}
              className="w-14 accent-editor-accent h-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Timecode formatter
function formatTimecode(seconds: number, fps: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const f = Math.floor((seconds % 1) * fps).toString().padStart(2, '0');
  return `${h}:${m}:${s}:${f}`;
}

// Helper placeholder
function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, label: string) {
  ctx.fillStyle = color + '30';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
}
