export interface Project {
    id: string;
    name: string;
    resolution: Resolution;
    fps: number;
    duration: number;
    tracks: Track[];
    createdAt: number;
    updatedAt: number;
}
export interface Resolution {
    width: number;
    height: number;
    label: string;
}
export interface Track {
    id: string;
    name: string;
    type: TrackType;
    clips: Clip[];
    locked: boolean;
    visible: boolean;
    volume: number;
    height: number;
}
export type TrackType = 'video' | 'audio' | 'text' | 'overlay';
export interface Clip {
    id: string;
    name: string;
    trackId: string;
    type: ClipType;
    startTime: number;
    duration: number;
    sourceOffset: number;
    sourceDuration: number;
    sourceFile?: string;
    transform: Transform;
    opacity: number;
    text?: TextProperties;
    effects: Effect[];
    color: string;
}
export type ClipType = 'video' | 'audio' | 'text' | 'image' | 'overlay';
export interface Transform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    anchorX: number;
    anchorY: number;
}
export interface TextProperties {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
    textAlign: 'left' | 'center' | 'right';
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    lineHeight: number;
    letterSpacing: number;
    animation: TextAnimation;
}
export type TextAnimation = 'none' | 'fade-in' | 'fade-out' | 'typewriter' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'bounce';
export interface Effect {
    id: string;
    type: EffectType;
    params: Record<string, number | string | boolean>;
}
export type EffectType = 'brightness' | 'contrast' | 'saturation' | 'blur' | 'grayscale' | 'sepia' | 'hue-rotate' | 'invert';
export interface MediaFile {
    id: string;
    name: string;
    path: string;
    type: 'video' | 'audio' | 'image';
    duration?: number;
    width?: number;
    height?: number;
    size: number;
    thumbnailUrl?: string;
    addedAt: number;
}
export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    playbackRate: number;
}
export type IpcChannels = 'open-file-dialog' | 'get-file-metadata' | 'generate-thumbnail' | 'export-video' | 'export-progress';
//# sourceMappingURL=types.d.ts.map