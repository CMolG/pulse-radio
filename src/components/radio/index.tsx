/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from './components/ErrorBoundary';

const RadioShell = dynamic(() => import('./RadioShell'), { ssr: false });

export default function RadioApp({ isPip }: { isPip?: boolean }) {
  return (
    <ErrorBoundary>
      <RadioShell isPip={isPip} />
    </ErrorBoundary>
  );
}
