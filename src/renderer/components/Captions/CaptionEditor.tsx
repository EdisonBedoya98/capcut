import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { Clip } from '../../../shared/types';

/**
 * Standalone caption editor panel.
 * Can be used to list, edit, and reorder captions in text tracks.
 */
export const CaptionEditor: React.FC = () => {
  const { project, selectClip, setCurrentTime, updateClip, removeClip, pushHistory, addCaptionClip } = useProjectStore();
  const [srtImportText, setSrtImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Get all caption clips from text tracks
  const captionClips: Clip[] = project.tracks
    .filter((t) => t.type === 'text')
    .flatMap((t) => t.clips)
    .sort((a, b) => a.startTime - b.startTime);

  const textTrack = project.tracks.find((t) => t.type === 'text');

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Parse SRT format
  const parseSRT = (srt: string) => {
    const blocks = srt.trim().split(/\n\n+/);
    const captions: { start: number; end: number; text: string }[] = [];

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const timeMatch = lines[1].match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      );
      if (!timeMatch) continue;

      const start =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;

      const end =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;

      const text = lines.slice(2).join('\n');
      captions.push({ start, end, text });
    }

    return captions;
  };

  const handleImportSRT = () => {
    if (!textTrack || !srtImportText.trim()) return;
    pushHistory();
    const captions = parseSRT(srtImportText);
    for (const cap of captions) {
      addCaptionClip(textTrack.id, cap.start, cap.end - cap.start, cap.text);
    }
    setSrtImportText('');
    setShowImport(false);
  };

  // Export captions to SRT
  const exportSRT = () => {
    let srt = '';
    captionClips.forEach((clip, i) => {
      const start = clip.startTime;
      const end = clip.startTime + clip.duration;
      const formatSRT = (t: number) => {
        const h = Math.floor(t / 3600).toString().padStart(2, '0');
        const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        const ms = Math.floor((t % 1) * 1000).toString().padStart(3, '0');
        return `${h}:${m}:${s},${ms}`;
      };
      srt += `${i + 1}\n${formatSRT(start)} --> ${formatSRT(end)}\n${clip.text?.content || clip.name}\n\n`;
    });

    // Download SRT file
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captions.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-editor-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-editor-muted">Captions</span>
        <div className="flex gap-1">
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-2 py-0.5 text-[10px] bg-editor-panel rounded hover:bg-editor-panel/80 text-editor-muted"
          >
            Import SRT
          </button>
          {captionClips.length > 0 && (
            <button
              onClick={exportSRT}
              className="px-2 py-0.5 text-[10px] bg-editor-panel rounded hover:bg-editor-panel/80 text-editor-muted"
            >
              Export SRT
            </button>
          )}
        </div>
      </div>

      {/* SRT Import */}
      {showImport && (
        <div className="p-2 border-b border-editor-border bg-editor-panel/30 animate-fade-in">
          <textarea
            value={srtImportText}
            onChange={(e) => setSrtImportText(e.target.value)}
            placeholder="Paste SRT content here..."
            className="w-full h-20 bg-editor-bg text-editor-text text-xs p-2 rounded border border-editor-border resize-none outline-none focus:border-editor-accent"
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleImportSRT}
              className="px-2 py-1 text-[10px] bg-editor-accent text-white rounded hover:bg-editor-accent/80"
            >
              Import
            </button>
            <button
              onClick={() => { setShowImport(false); setSrtImportText(''); }}
              className="px-2 py-1 text-[10px] bg-editor-panel text-editor-muted rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Caption list */}
      <div className="flex-1 overflow-y-auto">
        {captionClips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-editor-muted/50 text-xs px-4 text-center">
            <p>No captions yet</p>
            <p className="text-[10px] mt-1">Double-click on a text track or use the Media panel to add captions</p>
          </div>
        ) : (
          <div className="divide-y divide-editor-border/30">
            {captionClips.map((clip) => (
              <div
                key={clip.id}
                className="p-2 hover:bg-editor-panel/30 cursor-pointer transition-colors group"
                onClick={() => { selectClip(clip.id); setCurrentTime(clip.startTime); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-editor-text truncate">{clip.text?.content || 'Empty'}</p>
                    <p className="text-[10px] text-editor-muted mt-0.5">
                      {formatTime(clip.startTime)} → {formatTime(clip.startTime + clip.duration)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); pushHistory(); removeClip(clip.id); }}
                    className="opacity-0 group-hover:opacity-100 text-editor-muted hover:text-editor-accent text-xs transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
