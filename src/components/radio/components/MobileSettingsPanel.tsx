/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React from "react";
import { X, Languages, Sliders } from "lucide-react";
import { motion } from "motion/react";
import { useLocale } from "@/context/LocaleContext";
import EqPanel from "./EqPanel";
import type { EqBand, EqPreset } from "../types";

type NoiseReductionMode = "off" | "low" | "medium" | "high";

type Props = {
  onClose: () => void;
  eq: {
    bands: EqBand[];
    enabled: boolean;
    normalizerEnabled: boolean;
    stereoWidth: number;
    bassEnhance: number;
    compressorEnabled: boolean;
    compressorAmount: number;
    noiseReductionMode: NoiseReductionMode;
    customPresets: EqPreset[];
    setBandGain: (id: string, gain: number) => void;
    applyPreset: (gains: number[]) => void;
    toggleEnabled: () => void;
    toggleNormalizer: () => void;
    setStereoWidth: (w: number) => void;
    setBassEnhance: (v: number) => void;
    toggleCompressor: () => void;
    setCompressorAmount: (v: number) => void;
    setNoiseReductionMode: (mode: NoiseReductionMode) => void;
    saveCustomPreset: (name: string) => void;
    removeCustomPreset: (name: string) => void;
  };
  onPresetChange: (name: string | null) => void;
};

export default function MobileSettingsPanel({ onClose, eq, onPresetChange }: Props) {
  const { locale, setLocale, locales } = useLocale();
  const [showEq, setShowEq] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel slides up from bottom */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
        style={{
          background: "rgba(22, 24, 35, 0.92)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
        }}
        data-testid="mobile-settings-panel"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-[17px] font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-center-row rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-t border-white/8" />

        {/* Language section */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages size={16} className="text-white/60" />
            <span className="text-[14px] font-medium text-white/80">Language</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {locales.map((item) => (
              <button
                key={item.code}
                onClick={() => setLocale(item.code as typeof locale)}
                className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                  locale === item.code
                    ? "bg-sys-orange/20 border border-sys-orange/50 text-sys-orange"
                    : "bg-white/5 border border-white/8 text-white/60 hover:text-white/80"
                }`}
              >
                {item.nativeName}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/8" />

        {/* Equalizer section */}
        <div className="px-5 py-4">
          <button
            onClick={() => setShowEq((s) => !s)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-white/60" />
              <span className="text-[14px] font-medium text-white/80">Equalizer</span>
            </div>
            <div className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
              eq.enabled ? "bg-sys-orange/20 text-sys-orange" : "bg-white/5 text-white/40"
            }`}>
              {eq.enabled ? "ON" : "OFF"}
            </div>
          </button>

          {showEq && (
            <div className="mt-3 relative min-h-[360px]">
              <EqPanel
                bands={eq.bands}
                enabled={eq.enabled}
                normalizerEnabled={eq.normalizerEnabled}
                stereoWidth={eq.stereoWidth}
                bassEnhance={eq.bassEnhance}
                compressorEnabled={eq.compressorEnabled}
                compressorAmount={eq.compressorAmount}
                noiseReductionMode={eq.noiseReductionMode}
                customPresets={eq.customPresets}
                onSetGain={eq.setBandGain}
                onApplyPreset={eq.applyPreset}
                onToggleEnabled={eq.toggleEnabled}
                onToggleNormalizer={eq.toggleNormalizer}
                onSetStereoWidth={eq.setStereoWidth}
                onSetBassEnhance={eq.setBassEnhance}
                onToggleCompressor={eq.toggleCompressor}
                onSetCompressorAmount={eq.setCompressorAmount}
                onSetNoiseReductionMode={eq.setNoiseReductionMode}
                onSaveCustomPreset={eq.saveCustomPreset}
                onRemoveCustomPreset={eq.removeCustomPreset}
                onPresetChange={onPresetChange}
                onClose={() => setShowEq(false)}
              />
            </div>
          )}
        </div>

        {/* Bottom safe area padding */}
        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}
