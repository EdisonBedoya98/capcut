import React, { useCallback, useEffect, useState } from 'react';
import { useProjectStore } from './stores/projectStore';
import { Toolbar } from './components/Layout/Toolbar';
import { MediaBrowser } from './components/MediaBrowser/MediaBrowser';
import { PreviewCanvas } from './components/Preview/PreviewCanvas';
import { Inspector } from './components/Inspector/Inspector';
import { TimelineEditor } from './components/Timeline/TimelineEditor';

export type LeftPanelTab = 'media' | 'audio' | 'text' | 'stickers' | 'effects' | 'transitions' | 'captions' | 'filters' | 'templates';

const App: React.FC = () => {
  const { undo, redo, pushHistory, splitClip, selectedClipId, currentTime, removeClip, togglePlayback } = useProjectStore();
  const [leftTab, setLeftTab] = useState<LeftPanelTab>('media');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
      }
      if (e.key === 'b' || e.key === 'B') { if (selectedClipId) { pushHistory(); splitClip(selectedClipId, currentTime); } }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedClipId) { pushHistory(); removeClip(selectedClipId); } }
      if (e.key === ' ') { e.preventDefault(); togglePlayback(); }
    },
    [undo, redo, pushHistory, splitClip, selectedClipId, currentTime, removeClip, togglePlayback]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-screen w-screen bg-editor-bg text-editor-text overflow-hidden select-none">
      {/* Top Navigation Tabs */}
      <Toolbar activeTab={leftTab} onTabChange={setLeftTab} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left - Media Browser */}
        <div className="w-[340px] min-w-[280px] border-r border-editor-border flex flex-col bg-editor-surface">
          <MediaBrowser activeTab={leftTab} />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#111]">
          <PreviewCanvas />
        </div>

        {/* Right - Details / Inspector */}
        <div className="w-[300px] min-w-[260px] border-l border-editor-border flex flex-col bg-editor-surface">
          <Inspector />
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-[300px] min-h-[220px] border-t border-editor-border bg-editor-bg">
        <TimelineEditor />
      </div>
    </div>
  );
};

export default App;
