/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";

function LanguageSelector() {
  const { locale, setLocale, locales } = useLocale();
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-white/[0.06] text-[12px] text-dim">
      <Languages size={12} className="text-white/70" /> <span className="sr-only">Language</span><select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="bg-transparent text-white outline-none cursor-pointer"
        aria-label="Language selector"
        data-language-selector> {locales.map((item) => (
          <option key={item.code} value={item.code} className="bg-[#0a0f1a] text-white">{item.nativeName}</option>
        ))}</select></label>
  );
}

export default React.memo(LanguageSelector);