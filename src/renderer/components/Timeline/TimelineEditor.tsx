import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { TimelineTrack } from './TimelineTrack';
import { TimelineRuler } from './TimelineRuler';

export const TimelineEditor: React.FC = () => {
  const {
    project, currentTime, zoom, scrollX, setZoom, setScrollX, setCurrentTime, isPlaying,
    selectedClipId, splitClip, trimClipStart, trimClipEnd, removeClip, addClip, addTrack,
    getClipById, pushHistory, undo, redo,
  } = useProjectStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const projectDuration = useProjectStore.getState().getProjectDuration();
  const timelineWidth = Math.max(projectDuration * zoom + 200, 2000);
  const clip = selectedClipId ? getClipById(selectedClipId) : undefined;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom + (e.deltaY > 0 ? -5 : 5)); }
    else { setScrollX(scrollX + e.deltaX); }
  }, [zoom, scrollX, setZoom, setScrollX]);

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    setCurrentTime(Math.max(0, x / zoom));
  }, [scrollX, zoom, setCurrentTime]);

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
    const handleMove = (ev: MouseEvent) => {
      const tl = timelineRef.current;
      if (!tl) return;
      const rect = tl.getBoundingClientRect();
      setCurrentTime(Math.max(0, (ev.clientX - rect.left + scrollX) / zoom));
    };
    const handleUp = () => { setIsDraggingPlayhead(false); window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [scrollX, zoom, setCurrentTime]);

  useEffect(() => {
    if (!isPlaying || !timelineRef.current) return;
    const playheadX = currentTime * zoom;
    const viewWidth = timelineRef.current.clientWidth;
    if (playheadX - scrollX > viewWidth * 0.8) setScrollX(playheadX - viewWidth * 0.3);
  }, [currentTime, isPlaying, zoom, scrollX, setScrollX]);

  // Edit tool handlers
  const handleSplit = () => { if (clip && currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) { pushHistory(); splitClip(clip.id, currentTime); } };
  const handleTrimStart = () => { if (clip && currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) { pushHistory(); trimClipStart(clip.id, currentTime); } };
  const handleTrimEnd = () => { if (clip && currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) { pushHistory(); trimClipEnd(clip.id, currentTime); } };
  const handleDelete = () => { if (clip) { pushHistory(); removeClip(clip.id); } };
  const handleDuplicate = () => { if (clip) { pushHistory(); addClip(clip.trackId, { ...clip, name: clip.name + ' (copy)', startTime: clip.startTime + clip.duration }); } };

  const toolBtn = (enabled: boolean) =>
    `p-1.5 rounded transition-colors ${enabled ? 'text-editor-muted hover:text-editor-text hover:bg-[#333]' : 'text-[#444] cursor-not-allowed'}`;
  const hasClip = !!clip;

  return (
    <div className="flex flex-col h-full">
      {/* CapCut-style editing toolbar */}
      <div className="h-9 bg-editor-surface border-b border-editor-border flex items-center px-2 gap-0.5 shrink-0">
        {/* Add */}
        <button onClick={() => { pushHistory(); addTrack('video'); }} className={toolBtn(true)} title="Add track">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        {/* Cursor */}
        <button className={`${toolBtn(true)} text-editor-accent`} title="Select">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2l10 10-4.5 1 2.5 7-2.5 1-2.5-7L7 17V2z" /></svg>
        </button>

        <div className="w-px h-5 bg-editor-border mx-1" />

        {/* Undo */}
        <button onClick={undo} className={toolBtn(true)} title="Undo (Ctrl+Z)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
        </button>
        {/* Redo */}
        <button onClick={redo} className={toolBtn(true)} title="Redo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
        </button>

        <div className="w-px h-5 bg-editor-border mx-1" />

        {/* Split */}
        <button onClick={handleSplit} disabled={!hasClip} className={toolBtn(hasClip)} title="Split (B)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="3" width="16" height="18" rx="1" /><line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" />
          </svg>
        </button>
        {/* Trim Start */}
        <button onClick={handleTrimStart} disabled={!hasClip} className={toolBtn(hasClip)} title="Trim start">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="1" /><line x1="10" y1="5" x2="10" y2="19" /><rect x="3" y="5" width="7" height="14" fill="currentColor" opacity="0.15" />
          </svg>
        </button>
        {/* Trim End */}
        <button onClick={handleTrimEnd} disabled={!hasClip} className={toolBtn(hasClip)} title="Trim end">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="1" /><line x1="14" y1="5" x2="14" y2="19" /><rect x="14" y="5" width="7" height="14" fill="currentColor" opacity="0.15" />
          </svg>
        </button>
        {/* Delete */}
        <button onClick={handleDelete} disabled={!hasClip} className={toolBtn(hasClip)} title="Delete (Del)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
          </svg>
        </button>
        {/* Duplicate */}
        <button onClick={handleDuplicate} disabled={!hasClip} className={toolBtn(hasClip)} title="Duplicate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-editor-muted">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <button onClick={() => setZoom(zoom - 10)} className="text-editor-muted hover:text-editor-text text-sm px-0.5">−</button>
          <input type="range" min="10" max="300" value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-24 accent-editor-accent h-1" />
          <button onClick={() => setZoom(zoom + 10)} className="text-editor-muted hover:text-editor-text text-sm px-0.5">+</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div className="w-28 min-w-[112px] bg-editor-surface border-r border-editor-border flex flex-col shrink-0">
          <div className="h-5 border-b border-editor-border" />
          <div className="flex-1 overflow-y-auto">
            {project.tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-1 px-1.5 border-b border-editor-border/30 group" style={{ height: track.height }}>
                <button onClick={() => useProjectStore.getState().toggleTrackLock(track.id)}
                  className={`text-[10px] ${track.locked ? 'text-editor-accent' : 'text-[#555]'}`}>
                  {track.locked ? '🔒' : '🔓'}
                </button>
                <button onClick={() => useProjectStore.getState().toggleTrackVisibility(track.id)}
                  className={`text-[10px] ${track.visible ? 'text-editor-text' : 'text-[#555]'}`}>
                  {track.visible ? '👁' : '👁‍🗨'}
                </button>
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                    backgroundColor: track.type === 'video' ? '#00b8a9' : track.type === 'audio' ? '#f8b500' : track.type === 'text' ? '#6c5ce7' : '#e17055',
                  }} />
                  <span className="text-[10px] truncate text-editor-muted">{track.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline content */}
        <div ref={timelineRef} className="flex-1 overflow-auto relative"
          onWheel={handleWheel} onScroll={(e) => setScrollX((e.target as HTMLDivElement).scrollLeft)}>
          <div className="h-5 bg-editor-surface/50 border-b border-editor-border sticky top-0 z-20 cursor-pointer"
            onClick={handleRulerClick} style={{ width: timelineWidth }}>
            <TimelineRuler zoom={zoom} duration={projectDuration} scrollX={scrollX} />
          </div>
          <div style={{ width: timelineWidth }} className="relative">
            {project.tracks.map((track) => (
              <TimelineTrack key={track.id} track={track} zoom={zoom} />
            ))}
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-editor-playhead z-30 pointer-events-none" style={{ left: currentTime * zoom }}>
              <div className="absolute -top-5 -left-[5px] w-[11px] h-4 bg-editor-playhead cursor-grab active:cursor-grabbing pointer-events-auto rounded-sm"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)' }}
                onMouseDown={handlePlayheadMouseDown} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
