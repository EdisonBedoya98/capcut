import React, { useCallback, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { TimelineClip } from './TimelineClip';
import type { Track } from '../../../shared/types';

interface TimelineTrackProps {
  track: Track;
  zoom: number;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({ track, zoom }) => {
  const { addCaptionClip, addClip, pushHistory, selectTrack, selectedTrackId } = useProjectStore();
  const [dragOver, setDragOver] = useState(false);

  const isSelected = selectedTrackId === track.id;

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / zoom;

      pushHistory();
      if (track.type === 'text') {
        addCaptionClip(track.id, time, 3, 'New Caption');
      } else {
        const colors: Record<string, string> = {
          video: '#4a90d9',
          audio: '#50c878',
          text: '#e9a545',
          overlay: '#c45ae9',
        };
        addClip(track.id, {
          name: `New ${track.type} clip`,
          type: track.type === 'overlay' ? 'image' : track.type,
          startTime: time,
          duration: 5,
          color: colors[track.type] || '#4a90d9',
        });
      }
    },
    [track, zoom, addCaptionClip, addClip, pushHistory]
  );

  return (
    <div
      className={`relative border-b border-editor-border/50 ${
        dragOver ? 'bg-editor-accent/10' : isSelected ? 'bg-editor-track/50' : 'bg-editor-bg'
      } ${track.locked ? 'opacity-60' : ''}`}
      style={{ height: track.height }}
      onClick={() => selectTrack(track.id)}
      onDoubleClick={handleDoubleClick}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => setDragOver(false)}
    >
      {/* Track background grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        {Array.from({ length: Math.ceil(2000 / zoom) }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-editor-border"
            style={{ left: i * zoom }}
          />
        ))}
      </div>

      {/* Clips */}
      {track.clips.map((clip) => (
        <TimelineClip key={clip.id} clip={clip} zoom={zoom} track={track} />
      ))}

      {/* Empty track hint */}
      {track.clips.length === 0 && !track.locked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-editor-muted/30">Double-click to add clip</span>
        </div>
      )}
    </div>
  );
};
