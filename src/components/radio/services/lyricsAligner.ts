/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { LyricsData } from '../types'; import type { RealtimeAlignPolicy } from './realtimeLyricsTypes';
import { normalizeText } from '@/lib/stringUtils';
export type AlignerStepInput = {
  lyrics: LyricsData; hypothesisText: string; previousConfirmedIndex: number; previousCandidateIndex: number;
  stableSamples: number; policy: RealtimeAlignPolicy; };
export type AlignerStepResult = { candidateIndex: number; confirmedIndex: number; score: number; stableSamples: number;
  jumpRejected: boolean; relockTriggered: boolean; };
const STOPWORDS = new Set([ 'the', 'a', 'an', 'and', 'to', 'of', 'in', 'on', 'for', 'with',
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'por', 'con', 'un', 'una',]);
const WORD_RE = /[a-z0-9']+/g;
function tokenize(value: string): string[] {
  const normalized = normalizeText(value); if (!normalized) return []; const matches = normalized.match(WORD_RE) ?? [];
  return matches.filter(token => token.length > 1 && !STOPWORDS.has(token)); }
function scoreLine(lineTokens: string[], hypoTokens: string[]): number {
  if (!lineTokens.length || !hypoTokens.length) return 0; const lineSet = new Set(lineTokens); let overlaps = 0;
  for (const token of hypoTokens) { if (lineSet.has(token)) overlaps++; }
  const overlapScore = overlaps / Math.max(lineSet.size, 1); let ordered = 0; let lineIdx = 0;
  for (const token of hypoTokens) { for (let i = lineIdx; i < lineTokens.length; i++) {
      if (lineTokens[i] === token) { ordered++; lineIdx = i + 1; break;
      } }
  }
  const orderScore = ordered / Math.max(hypoTokens.length, 1); const shortPenalty = lineTokens.length <= 2 ? 0.2 : 0;
  return Math.max(0, overlapScore * 0.7 + orderScore * 0.3 - shortPenalty); }
function windowBounds(total: number, center: number, relockWindow: number): [number, number] {
  if (total <= 0) return [0, 0]; if (center < 0) return [0, Math.min(total - 1, relockWindow)];
  const start = Math.max(0, center - relockWindow); const end = Math.min(total - 1, center + relockWindow);
  return [start, end]; }
export function alignHypothesis(input: AlignerStepInput): AlignerStepResult {
  const { lyrics, hypothesisText, previousConfirmedIndex, previousCandidateIndex, stableSamples, policy, } = input;
  const hypoTokens = tokenize(hypothesisText);
  if (!hypoTokens.length) { return {
      candidateIndex: previousCandidateIndex, confirmedIndex: previousConfirmedIndex, score: 0, stableSamples,
      jumpRejected: false, relockTriggered: false, }; }
  const center = previousConfirmedIndex >= 0 ? previousConfirmedIndex : previousCandidateIndex;
  const [start, end] = windowBounds(lyrics.lines.length, center, policy.relockWindow); let bestIndex = -1;
  let bestScore = 0;
  for (let i = start; i <= end; i++) {
    const lineTokens = tokenize(lyrics.lines[i]?.text ?? ''); const score = scoreLine(lineTokens, hypoTokens);
    if (score > bestScore) { bestScore = score; bestIndex = i; } }
  if (bestIndex < 0 || bestScore < policy.candidateMinScore) { return {
      candidateIndex: previousCandidateIndex, confirmedIndex: previousConfirmedIndex, score: bestScore, stableSamples,
      jumpRejected: false, relockTriggered: false, }; }
  const sameCandidate = bestIndex === previousCandidateIndex; const nextStable = sameCandidate ? stableSamples + 1 : 1;
  const jumpDistance = previousConfirmedIndex >= 0 ? Math.abs(bestIndex - previousConfirmedIndex) : 0;
  const jumpRejected = previousConfirmedIndex >= 0 && jumpDistance > policy.maxJumpDistance;
  let confirmed = previousConfirmedIndex; let relockTriggered = false;
  if (!jumpRejected && bestScore >= policy.confirmMinScore && nextStable >= policy.minStableSamples) {
    confirmed = bestIndex;
  } else if (jumpRejected && bestScore >= Math.min(0.98, policy.confirmMinScore + 0.08)) {
    confirmed = bestIndex; relockTriggered = true; } // Strict relock path for distant jumps with very high confidence
  return { candidateIndex: bestIndex, confirmedIndex: confirmed, score: bestScore, stableSamples: nextStable,
    jumpRejected, relockTriggered, }; }
export function mapLineToEffectiveTime(lyrics: LyricsData, lineIndex: number): number | undefined {
  if (!lyrics.synced || !lyrics.lines.length || lineIndex < 0 || lineIndex >= lyrics.lines.length) return undefined;
  return lyrics.lines[lineIndex].time; }
