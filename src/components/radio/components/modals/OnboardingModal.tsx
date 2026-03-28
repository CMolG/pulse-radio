/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio as RadioIcon,
  Music,
  Heart,
  Palette,
  BarChart3,
  Smartphone,
  CheckCircle,
  Share2,
} from 'lucide-react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import { STORAGE_KEYS } from '../../constants';

const _IOS_UA_RE = /iPad|iPhone|iPod/;

const _MOTION_FADE_IN = { opacity: 0 } as const;
const _MOTION_FADE_VISIBLE = { opacity: 1 } as const;
const _MOTION_FADE_OUT = { opacity: 0 } as const;
const _MOTION_T_02 = { duration: 0.2 } as const;

const GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
};

type OnboardingStep = { icon: React.ReactNode; title: string; description: string };
const STEPS: OnboardingStep[] = [
  {
    icon: <RadioIcon size={48} className="text-[#3478f6]" aria-hidden="true" />,
    title: 'Welcome to Pulse',
    description:
      'Your free internet radio experience. Discover thousands of stations, genres and artists from around the world.',
  },
  {
    icon: <Music size={48} className="text-pink-400" aria-hidden="true" />,
    title: 'Live Radio & Lyrics',
    description:
      'Listen to live radio with real-time song detection, synchronized lyrics, and detailed track information.',
  },
  {
    icon: <Heart size={48} className="text-red-400" aria-hidden="true" />,
    title: 'Favorites & History',
    description:
      'Save your favorite stations and songs. Browse your listening history and rediscover music you loved.',
  },
  {
    icon: <Palette size={48} className="text-purple-400" aria-hidden="true" />,
    title: 'Immersive Visualizer',
    description:
      'Enjoy a reactive audio visualizer with CRT effects. Customize the sound with the built-in equalizer.',
  },
  {
    icon: <BarChart3 size={48} className="text-emerald-400" aria-hidden="true" />,
    title: 'Your Stats',
    description:
      'Track your listening habits — most played artists, genres, stations and songs. Your home adapts to your taste.',
  },
];
const _TOTAL_STEPS = STEPS.length + 1;
const _STEP_INDICES = Array.from({ length: _TOTAL_STEPS }, (_, i) => i);

export function PWAStep() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(
    null,
  );
  const [isIos] = useState(
    () => typeof navigator !== 'undefined' && _IOS_UA_RE.test(navigator.userAgent),
  );
  const [isStandalone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  );
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
      } catch {
        /* user dismissed install prompt */
      }
      setDeferredPrompt(null);
    }
  };
  if (isStandalone) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {' '}
        <CheckCircle size={48} className="text-emerald-400" />{' '}
        <h2 className="text-xl font-bold text-white">Already Installed!</h2>{' '}
        <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
          {' '}
          You&apos;re using Pulse as an app. Enjoy the full experience!
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {' '}
      <Smartphone size={48} className="text-[#3478f6]" />{' '}
      <h2 className="text-xl font-bold text-white">Install as App</h2>{' '}
      <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
        {' '}
        Install Pulse on your device for the best experience — instant access, offline support, and
        no browser bars.
      </p>{' '}
      {deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[#3478f6] text-white font-semibold text-[14px] hover:bg-[#2968d9] transition-colors active:scale-95"
        >
          Install Now
        </button>
      ) : isIos ? (
        <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
          {' '}
          <div className="flex items-center gap-2 text-[13px] text-white/70">
            {' '}
            <Share2 size={18} className="text-[#3478f6] flex-shrink-0" />{' '}
            <span>
              Tap <strong className="text-white">Share</strong> →{' '}
              <strong className="text-white">Add to Home Screen</strong>
            </span>{' '}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-white/50 mt-1">
          {' '}
          Use Chrome or Edge for the install option, or add this page to your home screen.
        </p>
      )}
    </div>
  );
}

function OnboardingModalInner() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const done = loadFromStorage<boolean>(STORAGE_KEYS.ONBOARDING_DONE, false);
    if (!done) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);
  const handleClose = useCallback(() => {
    setShow(false);
    saveToStorage(STORAGE_KEYS.ONBOARDING_DONE, true);
  }, []);
  if (!show) return null;
  const currentStep = step < STEPS.length ? STEPS[step] : null;
  const isPWAStep = step >= STEPS.length;
  const isLast = step === _TOTAL_STEPS - 1;
  return (
    <AnimatePresence>
      {' '}
      {show && (
        <motion.div
          initial={_MOTION_FADE_IN}
          animate={_MOTION_FADE_VISIBLE}
          exit={_MOTION_FADE_OUT}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
          }}
        >
          {' '}
          {/* Backdrop */}{' '}
          <div className="absolute inset-0 bg-black/70" onClick={handleClose} aria-hidden="true" />{' '}
          {/* Modal */}{' '}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden"
            style={GLASS_STYLE}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Pulse Radio"
          >
            {' '}
            {/* Content */}{' '}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {' '}
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={_MOTION_T_02}
                  className="flex flex-col items-center gap-4 text-center min-h-[200px] justify-center"
                >
                  {' '}
                  {currentStep ? (
                    <>
                      <div className="p-4 rounded-2xl bg-white/[0.06]">{currentStep.icon}</div>{' '}
                      <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>{' '}
                      <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
                        {currentStep.description}
                      </p>
                    </>
                  ) : isPWAStep ? (
                    <PWAStep />
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>{' '}
            {/* Progress dots + navigation */}{' '}
            <div className="px-8 pb-6 flex flex-col gap-4">
              {' '}
              {/* Dots */}{' '}
              <div className="flex justify-center gap-2">
                {' '}
                {_STEP_INDICES.map((i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all ${i === step ? 'w-6 h-2 bg-[#3478f6]' : 'w-2 h-2 bg-white/20 hover:bg-white/30'}`}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>{' '}
              {/* Buttons */}{' '}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={step > 0 ? () => setStep((s) => s - 1) : handleClose}
                  className={`px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${step > 0 ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-white/45 hover:text-white/60'}`}
                >
                  {step > 0 ? 'Back' : 'Skip'}
                </button>
                <button
                  onClick={() => (step < _TOTAL_STEPS - 1 ? setStep((s) => s + 1) : handleClose())}
                  className="px-6 py-2.5 rounded-xl bg-[#3478f6] text-white font-semibold text-[14px] hover:bg-[#2968d9] transition-colors active:scale-95"
                  autoFocus
                >
                  {isLast ? "Let's Go!" : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
const OnboardingModal = React.memo(OnboardingModalInner);

export default OnboardingModal;
