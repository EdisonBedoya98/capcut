import React, { useCallback, useState, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { Clip, Track } from '../../../shared/types';

interface TimelineClipProps {
  clip: Clip;
  zoom: number;
  track: Track;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({ clip, zoom, track }) => {
  const {
    selectedClipId,
    selectClip,
    moveClip,
    trimClipStart,
    trimClipEnd,
    pushHistory,
    setCurrentTime,
  } = useProjectStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<'start' | 'end' | null>(null);
  const dragStartRef = useRef({ x: 0, startTime: 0 });

  const isSelected = selectedClipId === clip.id;
  const left = clip.startTime * zoom;
  const width = clip.duration * zoom;

  // Click to select
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectClip(clip.id);
      setCurrentTime(clip.startTime);
    },
    [clip.id, clip.startTime, selectClip, setCurrentTime]
  );

  // Drag to move
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();

      selectClip(clip.id);
      pushHistory();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, startTime: clip.startTime };

      const handleMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - dragStartRef.current.x;
        const deltaTime = deltaX / zoom;
        const newStart = Math.max(0, dragStartRef.current.startTime + deltaTime);
        moveClip(clip.id, track.id, newStart);
      };

      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [clip, track, zoom, selectClip, moveClip, pushHistory]
  );

  // Trim handles
  const handleTrimStart = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();
      pushHistory();
      setIsTrimming('start');

      const startX = e.clientX;
      const originalStart = clip.startTime;

      const handleMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX;
        const deltaTime = deltaX / zoom;
        trimClipStart(clip.id, originalStart + deltaTime);
      };

      const handleUp = () => {
        setIsTrimming(null);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [clip, track, zoom, trimClipStart, pushHistory]
  );

  const handleTrimEnd = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();
      pushHistory();
      setIsTrimming('end');

      const startX = e.clientX;
      const originalEnd = clip.startTime + clip.duration;

      const handleMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX;
        const deltaTime = deltaX / zoom;
        trimClipEnd(clip.id, originalEnd + deltaTime);
      };

      const handleUp = () => {
        setIsTrimming(null);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [clip, track, zoom, trimClipEnd, pushHistory]
  );

  const getClipIcon = () => {
    switch (clip.type) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'text': return '✏️';
      case 'image': return '🖼️';
      default: return '📎';
    }
  };

  return (
    <div
      className={`clip absolute top-1 bottom-1 rounded-md cursor-grab active:cursor-grabbing transition-shadow ${
        isSelected ? 'selected ring-2 ring-editor-playhead shadow-lg shadow-editor-playhead/20' : ''
      } ${isDragging ? 'opacity-80 z-20' : ''} ${isTrimming ? 'z-20' : ''}`}
      style={{
        left,
        width: Math.max(width, 4),
        backgroundColor: clip.color + '80',
        borderLeft: `3px solid ${clip.color}`,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Clip content */}
      <div className="flex items-center h-full px-1.5 overflow-hidden gap-1">
        <span className="text-[10px] shrink-0">{getClipIcon()}</span>
        <span className="text-[10px] font-medium truncate text-white/90">
          {clip.type === 'text' && clip.text ? clip.text.content : clip.name}
        </span>
      </div>

      {/* Trim handle - Start */}
      <div
        className="clip-handle absolute left-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 rounded-l-md cursor-col-resize z-10"
        onMouseDown={handleTrimStart}
      />

      {/* Trim handle - End */}
      <div
        className="clip-handle absolute right-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 rounded-r-md cursor-col-resize z-10"
        onMouseDown={handleTrimEnd}
      />

      {/* Duration tooltip when trimming */}
      {(isTrimming || isDragging) && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-black/80 rounded text-[9px] text-white whitespace-nowrap z-30">
          {clip.duration.toFixed(2)}s
        </div>
      )}
    </div>
  );
};
