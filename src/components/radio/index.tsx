/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import dynamic from 'next/dynamic'; import { ErrorBoundary } from './components/ErrorBoundary'; import { STORAGE_KEYS } from './constants';
import { ensureStorageVersion } from '@/lib/storageUtils'; import { LocaleProvider } from '@/context/LocaleContext'; ensureStorageVersion(Object.values(STORAGE_KEYS)); const RadioShell = dynamic(() => import('./RadioShell'), { ssr: false });
export default function RadioApp({ isPip, initialCountryCode }: { isPip?: boolean; initialCountryCode?: string }) {
  return ( <ErrorBoundary><LocaleProvider countryCode={initialCountryCode}> <RadioShell isPip={isPip} initialCountryCode={initialCountryCode} /></LocaleProvider></ErrorBoundary> ); }
