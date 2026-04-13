import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Track, Clip, TrackType, MediaFile, TextProperties, Transform } from '../../shared/types';

// Default transform
const defaultTransform: Transform = {
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5,
};

// Default text properties
const defaultTextProps: TextProperties = {
  content: 'Text',
  fontFamily: 'Arial',
  fontSize: 48,
  fontWeight: 'bold',
  fontStyle: 'normal',
  color: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.6,
  textAlign: 'center',
  strokeColor: '#000000',
  strokeWidth: 2,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  lineHeight: 1.2,
  letterSpacing: 0,
  animation: 'none',
};

interface ProjectState {
  project: Project;
  mediaFiles: MediaFile[];
  selectedClipId: string | null;
  selectedTrackId: string | null;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  zoom: number; // pixels per second in timeline
  scrollX: number;

  // Project actions
  setProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  setResolution: (width: number, height: number, label: string) => void;

  // Track actions
  addTrack: (type: TrackType, name?: string) => string;
  removeTrack: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // Clip actions
  addClip: (trackId: string, clip: Partial<Clip>) => string;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  trimClipStart: (clipId: string, newStartTime: number) => void;
  trimClipEnd: (clipId: string, newEndTime: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;

  // Selection
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;

  // Playback
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackRate: (rate: number) => void;

  // Timeline
  setZoom: (zoom: number) => void;
  setScrollX: (scrollX: number) => void;

  // Media
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (fileId: string) => void;

  // Caption helpers
  addCaptionClip: (trackId: string, startTime: number, duration: number, text?: string) => string;

  // Computed
  getClipById: (clipId: string) => Clip | undefined;
  getTrackById: (trackId: string) => Track | undefined;
  getAllClips: () => Clip[];
  getProjectDuration: () => number;

  // Undo/Redo
  history: Project[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const createDefaultProject = (): Project => ({
  id: uuidv4(),
  name: 'Untitled Project',
  resolution: { width: 1920, height: 1080, label: '1080p' },
  fps: 30,
  duration: 60,
  tracks: [
    {
      id: uuidv4(),
      name: 'Video 1',
      type: 'video',
      clips: [],
      locked: false,
      visible: true,
      volume: 1,
      height: 60,
    },
    {
      id: uuidv4(),
      name: 'Audio 1',
      type: 'audio',
      clips: [],
      locked: false,
      visible: true,
      volume: 1,
      height: 40,
    },
    {
      id: uuidv4(),
      name: 'Captions',
      type: 'text',
      clips: [],
      locked: false,
      visible: true,
      volume: 1,
      height: 40,
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createDefaultProject(),
  mediaFiles: [],
  selectedClipId: null,
  selectedTrackId: null,
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,
  zoom: 50, // 50px per second
  scrollX: 0,
  history: [],
  historyIndex: -1,

  setProject: (project) => set({ project }),

  updateProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name, updatedAt: Date.now() },
    })),

  setResolution: (width, height, label) =>
    set((state) => ({
      project: {
        ...state.project,
        resolution: { width, height, label },
        updatedAt: Date.now(),
      },
    })),

  // Track actions
  addTrack: (type, name) => {
    const id = uuidv4();
    const trackName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${get().project.tracks.filter(t => t.type === type).length + 1}`;
    set((state) => ({
      project: {
        ...state.project,
        tracks: [
          ...state.project.tracks,
          {
            id,
            name: trackName,
            type,
            clips: [],
            locked: false,
            visible: true,
            volume: 1,
            height: type === 'video' ? 60 : 40,
          },
        ],
        updatedAt: Date.now(),
      },
    }));
    return id;
  },

  removeTrack: (trackId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.filter((t) => t.id !== trackId),
        updatedAt: Date.now(),
      },
    })),

  toggleTrackVisibility: (trackId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, visible: !t.visible } : t
        ),
      },
    })),

  toggleTrackLock: (trackId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, locked: !t.locked } : t
        ),
      },
    })),

  reorderTracks: (fromIndex, toIndex) =>
    set((state) => {
      const tracks = [...state.project.tracks];
      const [moved] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, moved);
      return { project: { ...state.project, tracks } };
    }),

  // Clip actions
  addClip: (trackId, clipData) => {
    const id = uuidv4();
    const clip: Clip = {
      id,
      name: clipData.name || 'Clip',
      trackId,
      type: clipData.type || 'video',
      startTime: clipData.startTime || 0,
      duration: clipData.duration || 5,
      sourceOffset: clipData.sourceOffset || 0,
      sourceDuration: clipData.sourceDuration || clipData.duration || 5,
      sourceFile: clipData.sourceFile,
      transform: clipData.transform || { ...defaultTransform },
      opacity: clipData.opacity ?? 1,
      text: clipData.text,
      effects: clipData.effects || [],
      color: clipData.color || '#4a90d9',
    };

    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
        updatedAt: Date.now(),
      },
    }));
    return id;
  },

  removeClip: (clipId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== clipId),
        })),
        updatedAt: Date.now(),
      },
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    })),

  updateClip: (clipId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
        })),
        updatedAt: Date.now(),
      },
    })),

  moveClip: (clipId, newTrackId, newStartTime) =>
    set((state) => {
      let clip: Clip | undefined;
      const tracksWithout = state.project.tracks.map((t) => {
        const found = t.clips.find((c) => c.id === clipId);
        if (found) clip = { ...found, trackId: newTrackId, startTime: Math.max(0, newStartTime) };
        return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
      });
      if (!clip) return state;
      return {
        project: {
          ...state.project,
          tracks: tracksWithout.map((t) =>
            t.id === newTrackId ? { ...t, clips: [...t.clips, clip!] } : t
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  trimClipStart: (clipId, newStartTime) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) return c;
            const oldEnd = c.startTime + c.duration;
            const clampedStart = Math.max(0, Math.min(newStartTime, oldEnd - 0.1));
            const delta = clampedStart - c.startTime;
            return {
              ...c,
              startTime: clampedStart,
              duration: c.duration - delta,
              sourceOffset: c.sourceOffset + delta,
            };
          }),
        })),
      },
    })),

  trimClipEnd: (clipId, newEndTime) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) return c;
            const newDuration = Math.max(0.1, newEndTime - c.startTime);
            return { ...c, duration: newDuration };
          }),
        })),
      },
    })),

  splitClip: (clipId, splitTime) =>
    set((state) => {
      const newTracks = state.project.tracks.map((t) => {
        const clipIndex = t.clips.findIndex((c) => c.id === clipId);
        if (clipIndex === -1) return t;
        const clip = t.clips[clipIndex];
        const relativeTime = splitTime - clip.startTime;
        if (relativeTime <= 0.1 || relativeTime >= clip.duration - 0.1) return t;

        const clip1: Clip = {
          ...clip,
          duration: relativeTime,
        };
        const clip2: Clip = {
          ...clip,
          id: uuidv4(),
          name: clip.name + ' (split)',
          startTime: splitTime,
          duration: clip.duration - relativeTime,
          sourceOffset: clip.sourceOffset + relativeTime,
        };
        const newClips = [...t.clips];
        newClips.splice(clipIndex, 1, clip1, clip2);
        return { ...t, clips: newClips };
      });
      return { project: { ...state.project, tracks: newTracks, updatedAt: Date.now() } };
    }),

  // Selection
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

  // Playback
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  // Timeline
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(300, zoom)) }),
  setScrollX: (scrollX) => set({ scrollX: Math.max(0, scrollX) }),

  // Media
  addMediaFile: (file) =>
    set((state) => ({ mediaFiles: [...state.mediaFiles, { ...file, id: file.id || uuidv4() }] })),
  removeMediaFile: (fileId) =>
    set((state) => ({ mediaFiles: state.mediaFiles.filter((f) => f.id !== fileId) })),

  // Caption helpers
  addCaptionClip: (trackId, startTime, duration, text) => {
    const id = uuidv4();
    const clip: Clip = {
      id,
      name: text || 'Caption',
      trackId,
      type: 'text',
      startTime,
      duration,
      sourceOffset: 0,
      sourceDuration: duration,
      transform: { ...defaultTransform, y: 0.35 },
      opacity: 1,
      text: { ...defaultTextProps, content: text || 'Your text here' },
      effects: [],
      color: '#e9a545',
    };
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
        updatedAt: Date.now(),
      },
    }));
    return id;
  },

  // Computed
  getClipById: (clipId) => {
    for (const track of get().project.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return clip;
    }
    return undefined;
  },

  getTrackById: (trackId) => get().project.tracks.find((t) => t.id === trackId),

  getAllClips: () => get().project.tracks.flatMap((t) => t.clips),

  getProjectDuration: () => {
    const allClips = get().getAllClips();
    if (allClips.length === 0) return get().project.duration;
    return Math.max(get().project.duration, ...allClips.map((c) => c.startTime + c.duration));
  },

  // Undo/Redo
  pushHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.project)));
      if (newHistory.length > 50) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        project: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        project: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
      };
    }),
}));
