/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React from 'react';
import { Languages } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { LiquidGlassButton } from './buttons/LiquidGlassButton';

function LanguageSelectorInner() {
  const { locale, setLocale, locales } = useLocale();
  return (
    <LiquidGlassButton
      className="!rounded-full px-3 py-1.5 text-[12px]"
      aria-label="Language selector"
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <Languages size={12} className="text-white/70" />
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          className="bg-transparent text-white outline-none cursor-pointer text-[12px]"
          aria-label="Language selector"
          data-language-selector
        >
          {locales.map((item) => (
            <option key={item.code} value={item.code} className="bg-[#0a0f1a] text-white">
              {item.nativeName}
            </option>
          ))}
        </select>
      </label>
    </LiquidGlassButton>
  );
}
const LanguageSelector = React.memo(LanguageSelectorInner);

export default LanguageSelector;
