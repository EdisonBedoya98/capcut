import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { MediaFile } from '../../../shared/types';
import type { LeftPanelTab } from '../../App';
import { v4 as uuidv4 } from 'uuid';

interface MediaBrowserProps {
  activeTab: LeftPanelTab;
}

export const MediaBrowser: React.FC<MediaBrowserProps> = ({ activeTab }) => {
  const { mediaFiles, addMediaFile, removeMediaFile, addClip, addCaptionClip, project, pushHistory } = useProjectStore();
  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'video/*,audio/*,image/*,.mov,.mkv,.avi,.webm,.mp4,.m4v,.flv,.wmv,.3gp,.ts,.mts';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let type: 'video' | 'audio' | 'image' = 'video';
        const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma', 'm4a', 'opus'];
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico'];
        if (audioExts.includes(ext)) type = 'audio';
        else if (imageExts.includes(ext)) type = 'image';

        const mediaFile: MediaFile = {
          id: uuidv4(),
          name: file.name,
          path: URL.createObjectURL(file),
          type,
          size: file.size,
          duration: type === 'image' ? 5 : undefined,
          addedAt: Date.now(),
        };

        if (type === 'video' || type === 'audio') {
          const el = document.createElement(type === 'video' ? 'video' : 'audio');
          el.src = mediaFile.path;
          el.onloadedmetadata = () => {
            mediaFile.duration = el.duration;
            if (type === 'video') {
              mediaFile.width = (el as HTMLVideoElement).videoWidth;
              mediaFile.height = (el as HTMLVideoElement).videoHeight;
            }
            addMediaFile({ ...mediaFile });
          };
          el.onerror = () => { mediaFile.duration = 10; addMediaFile(mediaFile); };
        } else {
          addMediaFile(mediaFile);
        }
      });
    };
    input.click();
  };

  const handleAddToTimeline = (file: MediaFile) => {
    pushHistory();
    const trackType = file.type === 'image' ? 'video' : file.type;
    const track = project.tracks.find((t) => t.type === trackType) || project.tracks[0];
    if (!track) return;
    const colors: Record<string, string> = { video: '#00b8a9', audio: '#f8b500', image: '#e17055' };
    addClip(track.id, {
      name: file.name,
      type: file.type === 'image' ? 'image' : file.type,
      duration: file.duration || 5,
      sourceDuration: file.duration || 5,
      sourceFile: file.path,
      color: colors[file.type] || '#00b8a9',
    });
  };

  const formatDuration = (s?: number) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const filteredFiles = filter === 'all' ? mediaFiles : mediaFiles.filter((f) => f.type === filter);

  // Render content based on active tab
  if (activeTab === 'text' || activeTab === 'captions') {
    return <CaptionPanel />;
  }

  if (activeTab !== 'media' && activeTab !== 'audio') {
    return (
      <div className="flex-1 flex items-center justify-center text-editor-muted text-xs text-center px-8">
        <div>
          <div className="text-2xl mb-2 opacity-30">🚧</div>
          <p className="capitalize">{activeTab} panel</p>
          <p className="text-[10px] mt-1 text-editor-muted/60">Coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-editor-border">
        <button
          onClick={handleImport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-editor-accent text-white rounded font-medium hover:bg-editor-accent/90 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Import
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-editor-text border border-editor-border rounded hover:bg-editor-panel transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2" /></svg>
          Record
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-3 py-1.5 flex items-center gap-1 border-b border-editor-border/50">
        <span className="text-[10px] text-editor-muted mr-1">Filter:</span>
        {(['all', 'video', 'audio', 'image'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors capitalize
              ${filter === f ? 'bg-editor-accent/20 text-editor-accent' : 'text-editor-muted hover:text-editor-text hover:bg-editor-panel'}`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-editor-muted text-center px-6">
            <div className="text-3xl mb-2 opacity-30">📂</div>
            <p className="text-xs">No media files</p>
            <button onClick={handleImport} className="text-[11px] text-editor-accent hover:underline mt-1">Import files</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {filteredFiles.map((file) => (
              <MediaThumbnail
                key={file.id}
                file={file}
                onAdd={() => handleAddToTimeline(file)}
                onRemove={() => removeMediaFile(file.id)}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Thumbnail card
const MediaThumbnail: React.FC<{
  file: MediaFile;
  onAdd: () => void;
  onRemove: () => void;
  formatDuration: (s?: number) => string;
}> = ({ file, onAdd, onRemove, formatDuration }) => {
  const [added, setAdded] = useState(false);

  return (
    <div
      className="group relative rounded overflow-hidden bg-editor-bg cursor-pointer aspect-[4/3]"
      onClick={() => { onAdd(); setAdded(true); }}
    >
      {/* Thumbnail */}
      {file.type === 'video' ? (
        <video src={file.path} className="w-full h-full object-cover" muted preload="metadata" />
      ) : file.type === 'image' ? (
        <img src={file.path} className="w-full h-full object-cover" alt={file.name} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-editor-panel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f8b500" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
        </div>
      )}

      {/* Added badge */}
      {added && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-editor-accent text-white text-[9px] font-semibold rounded">
          Added
        </div>
      )}

      {/* Duration badge */}
      {file.duration && file.duration > 0 && (
        <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/70 text-white text-[9px] rounded font-mono">
          {formatDuration(file.duration)}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <svg className="opacity-0 group-hover:opacity-100 transition-opacity" width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>

      {/* Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
        <p className="text-[9px] text-white truncate">{file.name}</p>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-black/60 rounded transition-opacity"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
};

// Caption panel for Text/Captions tab
const CaptionPanel: React.FC = () => {
  const { project, pushHistory, addCaptionClip, currentTime } = useProjectStore();

  const templates = [
    { name: 'Basic Caption', fontSize: 48, color: '#ffffff', bg: '#000000' },
    { name: 'Subtitle', fontSize: 36, color: '#ffffff', bg: '#00000080' },
    { name: 'Bold Title', fontSize: 64, color: '#ffffff', bg: 'transparent' },
    { name: 'Karaoke', fontSize: 52, color: '#ffff00', bg: '#000000' },
    { name: 'Neon', fontSize: 48, color: '#00ff88', bg: 'transparent' },
    { name: 'Cinema', fontSize: 40, color: '#e8e8e8', bg: '#1a1a1a' },
  ];

  const handleAddCaption = (template: typeof templates[0]) => {
    pushHistory();
    const textTrack = project.tracks.find((t) => t.type === 'text');
    if (textTrack) {
      addCaptionClip(textTrack.id, currentTime, 3, template.name);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-editor-border">
        <p className="text-xs font-semibold text-editor-text">Caption Templates</p>
        <p className="text-[10px] text-editor-muted mt-0.5">Click to add at playhead position</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => handleAddCaption(t)}
              className="aspect-video rounded-lg bg-editor-bg border border-editor-border hover:border-editor-accent/50 flex items-center justify-center transition-colors group"
            >
              <span
                className="text-xs font-bold group-hover:scale-105 transition-transform"
                style={{ color: t.color, textShadow: t.color === '#ffffff' ? '0 1px 4px rgba(0,0,0,0.8)' : 'none' }}
              >
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
