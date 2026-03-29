import type { LyricsData } from '@/components/radio/constants';

type RealtimeSyncStatus =
  | 'idle'
  | 'unsupported'
  | 'ready'
  | 'listening'
  | 'recovering'
  | 'disabled'
  | 'error';
type RealtimeSyncQualityMode = 'high' | 'balanced' | 'conservative';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RealtimeSpeechHypothesis = {
  text: string;
  confidence: number;
  isFinal: boolean;
  tsMs: number;
};
type RealtimeSyncDiagnostics = {
  qualityMode: RealtimeSyncQualityMode;
  lastHypothesisMs: number | null;
  hypothesesSeen: number;
  confirmedTransitions: number;
  rejectedJumps: number;
  relockCount: number;
  errorMessage: string | null;
};
type RealtimeSyncState = {
  enabled: boolean;
  supported: boolean;
  status: RealtimeSyncStatus;
  activeLineIndex: number;
  candidateLineIndex: number;
  confidence: number;
  effectiveCurrentTime: number | undefined;
  diagnostics: RealtimeSyncDiagnostics;
};
type RealtimeSyncControls = { toggle: () => void };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RealtimeSyncResult = RealtimeSyncState & RealtimeSyncControls;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RealtimeAlignPolicy = {
  candidateMinScore: number;
  confirmMinScore: number;
  minStableSamples: number;
  maxJumpDistance: number;
  relockWindow: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CacheEntry = { key: string; data: LyricsData; ts: number };
