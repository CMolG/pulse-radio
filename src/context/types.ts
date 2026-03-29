import type {LyricsData} from "@/components/radio/constants";

type RealtimeSyncStatus =
    | 'idle'
    | 'unsupported'
    | 'ready'
    | 'listening'
    | 'recovering'
    | 'disabled'
    | 'error';
type RealtimeSyncQualityMode = 'high' | 'balanced' | 'conservative';
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
type RealtimeSyncResult = RealtimeSyncState & RealtimeSyncControls;
type RealtimeAlignPolicy = {
    candidateMinScore: number;
    confirmMinScore: number;
    minStableSamples: number;
    maxJumpDistance: number;
    relockWindow: number;
};

type CacheEntry = { key: string; data: LyricsData; ts: number };