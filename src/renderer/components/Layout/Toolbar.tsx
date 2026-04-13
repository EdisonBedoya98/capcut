import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { LeftPanelTab } from '../../App';

const TABS: { id: LeftPanelTab; label: string; icon: string }[] = [
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'text', label: 'Text', icon: '𝐓' },
  { id: 'stickers', label: 'Stickers', icon: '😀' },
  { id: 'effects', label: 'Effects', icon: '✨' },
  { id: 'transitions', label: 'Transitions', icon: '⬡' },
  { id: 'captions', label: 'Captions', icon: '💬' },
  { id: 'filters', label: 'Filters', icon: '🎨' },
  { id: 'templates', label: 'Templates', icon: '📐' },
];

const RESOLUTION_PRESETS = [
  { label: '1080p', width: 1920, height: 1080, group: 'Horizontal' },
  { label: '720p', width: 1280, height: 720, group: 'Horizontal' },
  { label: '4K', width: 3840, height: 2160, group: 'Horizontal' },
  { label: '9:16', width: 1080, height: 1920, group: 'Vertical' },
  { label: '9:16 720', width: 720, height: 1280, group: 'Vertical' },
  { label: '4:5', width: 1080, height: 1350, group: 'Vertical' },
  { label: '1:1', width: 1080, height: 1080, group: 'Square' },
];

interface ToolbarProps {
  activeTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTab, onTabChange }) => {
  const { project, pushHistory, setResolution } = useProjectStore();
  const [showResMenu, setShowResMenu] = useState(false);

  return (
    <div className="h-11 bg-editor-surface border-b border-editor-border flex items-center shrink-0">
      {/* Tabs */}
      <div className="flex items-center h-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`h-full px-4 flex flex-col items-center justify-center gap-0 text-[11px] transition-colors relative
              ${activeTab === tab.id
                ? 'text-editor-accent'
                : 'text-editor-muted hover:text-editor-text'
              }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span className="leading-none mt-0.5">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-editor-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: resolution + export */}
      <div className="flex items-center gap-2 pr-3">
        {/* Resolution dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowResMenu(!showResMenu)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-editor-muted hover:text-editor-text rounded hover:bg-editor-panel transition-colors"
          >
            <span>{project.resolution.width}×{project.resolution.height}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
          </button>

          {showResMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowResMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-editor-panel border border-editor-border rounded-lg shadow-2xl z-50 py-1 animate-fade-in">
                {['Horizontal', 'Vertical', 'Square'].map((group) => {
                  const presets = RESOLUTION_PRESETS.filter((p) => p.group === group);
                  return (
                    <div key={group}>
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase text-editor-muted">{group}</div>
                      {presets.map((p) => {
                        const active = project.resolution.width === p.width && project.resolution.height === p.height;
                        return (
                          <button
                            key={p.label}
                            onClick={() => { pushHistory(); setResolution(p.width, p.height, p.label); setShowResMenu(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${active ? 'text-editor-accent bg-editor-accent/10' : 'text-editor-text hover:bg-editor-border/50'}`}
                          >
                            <span className="flex-1">{p.width} × {p.height}</span>
                            <span className="text-[10px] text-editor-muted">{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* FPS */}
        <span className="text-[11px] text-editor-muted">{project.fps}fps</span>

        {/* Share */}
        <button className="px-3 py-1 text-[11px] text-editor-text rounded border border-editor-border hover:bg-editor-panel transition-colors">
          Share
        </button>

        {/* Export */}
        <button className="px-4 py-1 text-[11px] bg-editor-accent text-white rounded font-semibold hover:bg-editor-accent/90 transition-colors">
          Export
        </button>
      </div>
    </div>
  );
};
