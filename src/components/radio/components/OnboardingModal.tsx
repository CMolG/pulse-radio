/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IoRadioOutline, IoMusicalNotesOutline, IoHeartOutline, IoStatsChartOutline,
  IoColorPaletteOutline, IoPhonePortraitOutline, IoShareOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';
const ONBOARDING_KEY = 'radio-onboarding-done';
const GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)', backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
};
type OnboardingStep = { icon: React.ReactNode; title: string; description: string; };
const STEPS: OnboardingStep[] = [
  { icon: <IoRadioOutline size={48} className="text-[#3478f6]" />, title: 'Welcome to Pulse',
    description: 'Your free internet radio experience. Discover thousands of stations, genres and artists from around the world.',
  }, { icon: <IoMusicalNotesOutline size={48} className="text-pink-400" />, title: 'Live Radio & Lyrics',
    description: 'Listen to live radio with real-time song detection, synchronized lyrics, and detailed track information.',
  }, { icon: <IoHeartOutline size={48} className="text-red-400" />, title: 'Favorites & History',
    description: 'Save your favorite stations and songs. Browse your listening history and rediscover music you loved.',
  }, { icon: <IoColorPaletteOutline size={48} className="text-purple-400" />, title: 'Immersive Visualizer',
    description: 'Enjoy a reactive audio visualizer with CRT effects. Customize the sound with the built-in equalizer.',
  }, { icon: <IoStatsChartOutline size={48} className="text-emerald-400" />, title: 'Your Stats',
    description: 'Track your listening habits — most played artists, genres, stations and songs. Your home adapts to your taste.',
  },];
function PWAStep() { const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [isIos] = useState(() => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent));
  const [isStandalone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);
  useEffect(() => { const handler = (e: Event) => {
      e.preventDefault(); setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    }; window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);}, []);
  const handleInstall = async () => { if (deferredPrompt) {
      try { await deferredPrompt.prompt(); } catch { /* user dismissed install prompt */ }
      setDeferredPrompt(null);
    }
  };
  if (isStandalone) { return (
      <div className="flex flex-col items-center gap-4 text-center">
        <IoCheckmarkCircleOutline size={48} className="text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Already Installed!</h2>
        <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
          You&apos;re using Pulse as an app. Enjoy the full experience!</p></div>
    );
  }
  return ( <div className="flex flex-col items-center gap-4 text-center">
      <IoPhonePortraitOutline size={48} className="text-[#3478f6]" />
      <h2 className="text-xl font-bold text-white">Install as App</h2>
      <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
        Install Pulse on your device for the best experience — instant access, offline support, and no browser bars.</p>
      {deferredPrompt ? ( <button
          onClick={handleInstall}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[#3478f6] text-white font-semibold text-[14px] hover:bg-[#2968d9] transition-colors active:scale-95"
        >Install Now</button>
      ) : isIos ? ( <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-[13px] text-white/70">
            <IoShareOutline size={18} className="text-[#3478f6] flex-shrink-0" />
            <span>Tap <strong className="text-white">Share</strong> → <strong className="text-white">Add to Home Screen</strong></span>
          </div></div>
      ) : ( <p className="text-[12px] text-white/40 mt-1">
          Use Chrome or Edge for the install option, or add this page to your home screen.</p>)}</div>
  );
}
function OnboardingModal() { const [show, setShow] = useState(false); const [step, setStep] = useState(0);
  const totalSteps = STEPS.length + 1; // +1 for PWA step
  useEffect(() => { const done = loadFromStorage<boolean>(ONBOARDING_KEY, false);
    if (!done) { const timer = setTimeout(() => setShow(true), 800); return () => clearTimeout(timer); }
  }, []); const handleClose = useCallback(() => { setShow(false); saveToStorage(ONBOARDING_KEY, true); }, []);
  if (!show) return null; const currentStep = step < STEPS.length ? STEPS[step] : null;
  const isPWAStep = step >= STEPS.length; const isLast = step === totalSteps - 1;
  return ( <AnimatePresence>
      {show && ( <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"> {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" onClick={handleClose} /> {/* Modal */} <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden"
            style={GLASS_STYLE}> {/* Content */} <div className="p-8"><AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-4 text-center min-h-[200px] justify-center">
                  {currentStep ? ( <><div className="p-4 rounded-2xl bg-white/[0.06]">{currentStep.icon}</div>
                      <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
                      <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">{currentStep.description}</p></>
                  ) : isPWAStep ? ( <PWAStep />
                  ) : null}</motion.div></AnimatePresence></div>
            {/* Progress dots + navigation */} <div className="px-8 pb-6 flex flex-col gap-4">
              {/* Dots */} <div className="flex justify-center gap-2">
                {Array.from({ length: totalSteps }, (_, i) => ( <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all ${
                      i === step ? 'w-6 h-2 bg-[#3478f6]' : 'w-2 h-2 bg-white/20 hover:bg-white/30'
                    }`}
                    aria-label={`Step ${i + 1}`} />
                ))}</div>
              {/* Buttons */} <div className="flex items-center justify-between gap-3"><button
                  onClick={step > 0 ? () => setStep(s => s - 1) : handleClose}
                  className={`px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${step > 0 ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-white/40 hover:text-white/60'}`}
                >{step > 0 ? 'Back' : 'Skip'}</button><button
                  onClick={() => step < totalSteps - 1 ? setStep(s => s + 1) : handleClose()}
                  className="px-6 py-2.5 rounded-xl bg-[#3478f6] text-white font-semibold text-[14px] hover:bg-[#2968d9] transition-colors active:scale-95"
                >{isLast ? "Let's Go!" : 'Next'}</button></div></div></motion.div></motion.div>)}</AnimatePresence>
  );
}
export default React.memo(OnboardingModal);
