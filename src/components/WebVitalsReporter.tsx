/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useReportWebVitals } from 'next/web-vitals';

// Future integration point: replace console.log with Vercel Analytics,
// Plausible, or a custom /api/vitals endpoint.
const onMetric = (metric: {
  name: string;
  value: number;
  rating: string;
  navigationType: string;
  id: string;
}) => {
  console.log(
    JSON.stringify({
      metric: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      navigationType: metric.navigationType,
    }),
  );
};

export function WebVitalsReporter() {
  useReportWebVitals(onMetric);
  return null;
}
