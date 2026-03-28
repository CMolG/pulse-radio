/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import type React from 'react';

export interface ConcertEvent {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  lineup: string[];
  ticketUrl: string | null;
}

export const CONCERT_PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.25)',
  backdropFilter: 'blur(12px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(12px) saturate(1.3)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export const CONCERT_ITEM_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
};
