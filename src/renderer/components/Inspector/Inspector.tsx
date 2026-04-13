import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { TextProperties } from '../../../shared/types';

export const Inspector: React.FC = () => {
  const { selectedClipId, getClipById, project } = useProjectStore();
  const clip = selectedClipId ? getClipById(selectedClipId) : undefined;
  const [tab, setTab] = useState<'project' | 'details'>(clip ? 'details' : 'project');

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-editor-border shrink-0">
        <button onClick={() => setTab('project')}
          className={`flex-1 py-2 text-xs font-medium transition-colors relative ${tab === 'project' ? 'text-editor-text' : 'text-editor-muted hover:text-editor-text'}`}>
          Project
          {tab === 'project' && <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-editor-accent rounded-full" />}
        </button>
        <button onClick={() => setTab('details')}
          className={`flex-1 py-2 text-xs font-medium transition-colors relative ${tab === 'details' ? 'text-editor-accent' : 'text-editor-muted hover:text-editor-text'}`}>
          Details
          {tab === 'details' && <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-editor-accent rounded-full" />}
        </button>
      </div>

      {tab === 'project' ? <ProjectPanel /> : clip ? <ClipDetails clip={clip} /> : (
        <div className="flex-1 flex items-center justify-center text-editor-muted text-xs px-6 text-center">Select a clip to see details</div>
      )}
    </div>
  );
};

const ProjectPanel: React.FC = () => {
  const { project, updateProjectName } = useProjectStore();
  const totalClips = project.tracks.reduce((a, t) => a + t.clips.length, 0);
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <InfoRow label="Name">
        <input type="text" value={project.name} onChange={(e) => updateProjectName(e.target.value)}
          className="bg-transparent text-xs text-editor-text outline-none w-full text-right hover:bg-editor-panel/50 px-1 py-0.5 rounded" />
      </InfoRow>
      <InfoRow label="Resolution"><span className="text-xs text-editor-text">{project.resolution.width} × {project.resolution.height}</span></InfoRow>
      <InfoRow label="Aspect ratio"><span className="text-xs text-editor-text">{project.resolution.width === project.resolution.height ? '1:1' : project.resolution.width > project.resolution.height ? '16:9' : '9:16'}</span></InfoRow>
      <InfoRow label="Frame rate"><span className="text-xs text-editor-text">{project.fps}.00fps</span></InfoRow>
      <InfoRow label="Tracks"><span className="text-xs text-editor-text">{project.tracks.length}</span></InfoRow>
      <InfoRow label="Total clips"><span className="text-xs text-editor-text">{totalClips}</span></InfoRow>
      <InfoRow label="Timeline name"><span className="text-xs text-editor-text">Timeline 01</span></InfoRow>
      <div className="pt-3 border-t border-editor-border">
        <button className="w-full py-2 text-xs text-editor-accent border border-editor-accent/30 rounded hover:bg-editor-accent/10 transition-colors">Modify</button>
      </div>
    </div>
  );
};

const ClipDetails: React.FC<{ clip: any }> = ({ clip }) => {
  const { updateClip, pushHistory, removeClip } = useProjectStore();
  const handle = (u: Record<string, any>) => { pushHistory(); updateClip(clip.id, u); };
  const handleT = (k: string, v: number) => handle({ transform: { ...clip.transform, [k]: v } });
  const handleTxt = (k: keyof TextProperties, v: any) => handle({ text: { ...clip.text, [k]: v } });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <Section title="Clip">
        <InfoRow label="Name"><input type="text" value={clip.name} onChange={(e) => handle({ name: e.target.value })}
          className="bg-transparent text-xs text-editor-text outline-none w-full text-right hover:bg-editor-panel/50 px-1 py-0.5 rounded" /></InfoRow>
        <InfoRow label="Type"><span className="text-xs text-editor-text capitalize">{clip.type}</span></InfoRow>
        <InfoRow label="Start"><NumInput value={clip.startTime} onChange={(v) => handle({ startTime: v })} step={0.1} suffix="s" /></InfoRow>
        <InfoRow label="Duration"><NumInput value={clip.duration} onChange={(v) => handle({ duration: v })} step={0.1} min={0.1} suffix="s" /></InfoRow>
        <InfoRow label="Opacity">
          <div className="flex items-center gap-2">
            <input type="range" min="0" max="1" step="0.01" value={clip.opacity} onChange={(e) => handle({ opacity: parseFloat(e.target.value) })} className="flex-1 accent-editor-accent h-1" />
            <span className="text-[10px] text-editor-muted w-7 text-right">{Math.round(clip.opacity * 100)}%</span>
          </div>
        </InfoRow>
      </Section>

      {(clip.type === 'video' || clip.type === 'image' || clip.type === 'text') && (
        <Section title="Transform">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <InfoRow label="X"><NumInput value={clip.transform.x} onChange={(v) => handleT('x', v)} step={0.01} /></InfoRow>
            <InfoRow label="Y"><NumInput value={clip.transform.y} onChange={(v) => handleT('y', v)} step={0.01} /></InfoRow>
            <InfoRow label="Scale X"><NumInput value={clip.transform.scaleX} onChange={(v) => handleT('scaleX', v)} step={0.1} min={0.1} /></InfoRow>
            <InfoRow label="Scale Y"><NumInput value={clip.transform.scaleY} onChange={(v) => handleT('scaleY', v)} step={0.1} min={0.1} /></InfoRow>
          </div>
          <InfoRow label="Rotation">
            <div className="flex items-center gap-2">
              <input type="range" min="-180" max="180" step="1" value={clip.transform.rotation} onChange={(e) => handleT('rotation', parseFloat(e.target.value))} className="flex-1 accent-editor-accent h-1" />
              <span className="text-[10px] text-editor-muted w-8 text-right">{clip.transform.rotation}°</span>
            </div>
          </InfoRow>
        </Section>
      )}

      {clip.type === 'text' && clip.text && (
        <Section title="Text">
          <textarea value={clip.text.content} onChange={(e) => handleTxt('content', e.target.value)}
            className="w-full bg-editor-bg border border-editor-border rounded p-2 text-xs text-editor-text outline-none resize-none h-16 focus:border-editor-accent" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <InfoRow label="Font"><select value={clip.text.fontFamily} onChange={(e) => handleTxt('fontFamily', e.target.value)}
              className="bg-editor-bg border border-editor-border rounded px-1 py-0.5 text-[11px] text-editor-text outline-none w-full">
              {['Arial','Helvetica','Times New Roman','Georgia','Verdana','Impact','Courier New'].map((f) => <option key={f} value={f}>{f}</option>)}</select></InfoRow>
            <InfoRow label="Size"><NumInput value={clip.text.fontSize} onChange={(v) => handleTxt('fontSize', v)} step={2} min={8} max={200} /></InfoRow>
            <InfoRow label="Color"><input type="color" value={clip.text.color} onChange={(e) => handleTxt('color', e.target.value)} className="w-full h-6 rounded border border-editor-border cursor-pointer" /></InfoRow>
            <InfoRow label="BG"><input type="color" value={clip.text.backgroundColor} onChange={(e) => handleTxt('backgroundColor', e.target.value)} className="w-full h-6 rounded border border-editor-border cursor-pointer" /></InfoRow>
          </div>
          <InfoRow label="Animation"><select value={clip.text.animation} onChange={(e) => handleTxt('animation', e.target.value)}
            className="bg-editor-bg border border-editor-border rounded px-1 py-0.5 text-[11px] text-editor-text outline-none w-full">
            {['none','fade-in','fade-out','typewriter','slide-up','slide-down','scale-in','bounce'].map((a) => <option key={a} value={a}>{a.replace(/-/g,' ')}</option>)}</select></InfoRow>
        </Section>
      )}

      <Section title="Adjustments">
        {[{ t: 'brightness', l: 'Brightness' }, { t: 'contrast', l: 'Contrast' }, { t: 'saturation', l: 'Saturation' }].map(({ t, l }) => {
          const ef = clip.effects.find((e: any) => e.type === t);
          const val = ef ? (ef.params.value as number) : 0;
          return (
            <InfoRow key={t} label={l}>
              <div className="flex items-center gap-2">
                <input type="range" min="-1" max="1" step="0.05" value={val}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    const ne = clip.effects.filter((x: any) => x.type !== t);
                    if (v !== 0) ne.push({ id: t, type: t, params: { value: v } });
                    handle({ effects: ne });
                  }} className="flex-1 accent-editor-accent h-1" />
                <span className="text-[10px] text-editor-muted w-7 text-right">{val.toFixed(1)}</span>
              </div>
            </InfoRow>
          );
        })}
      </Section>

      <button onClick={() => { pushHistory(); removeClip(clip.id); }}
        className="w-full py-2 text-xs text-red-400 border border-red-400/20 rounded hover:bg-red-400/10 transition-colors">Delete Clip</button>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div><h3 className="text-[10px] font-semibold uppercase tracking-wider text-editor-muted mb-2">{title}</h3><div className="space-y-2">{children}</div></div>
);
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-editor-muted shrink-0">{label}</span><div className="flex-1 min-w-0">{children}</div></div>
);
const NumInput: React.FC<{ value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }> = ({ value, onChange, step = 1, min, max, suffix }) => (
  <div className="flex items-center justify-end gap-0.5">
    <input type="number" value={parseFloat(value.toFixed(3))} step={step}
      onChange={(e) => { let v = parseFloat(e.target.value) || 0; if (min !== undefined) v = Math.max(min, v); if (max !== undefined) v = Math.min(max, v); onChange(v); }}
      className="w-full bg-editor-bg border border-editor-border rounded px-1.5 py-0.5 text-[11px] text-editor-text outline-none text-right focus:border-editor-accent" />
    {suffix && <span className="text-[10px] text-editor-muted">{suffix}</span>}
  </div>
);
