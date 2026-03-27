---
task_id: ARCH-047
target_agent: auto-feature-engineer-finite
target_module: src/context/LocaleContext.tsx
priority: medium
status: pending
---

# Complete i18n Translations for Top 10 Non-English Languages

## Context

Pulse Radio declares support for 36 languages but only 6 have any translations (es, fr, de, pt-BR, pt, ja, ar), and even those are incomplete (~10-28 keys out of 42+ total message keys). The remaining 30 languages show 100% English fallback. This means:

- A Korean user selecting "한국어" sees English everywhere except the language picker.
- A Hindi user gets zero translated strings.
- Chinese (both simplified and traditional) users see all English.

For an app with "36 language support" as a feature claim, this is a major UX gap. The top 10 non-English languages by internet user population should have complete translations.

## Directive

1. **Identify the 42+ BASE_MESSAGES keys** in the locale context. List all translatable strings.

2. **Complete translations for these 10 languages** (prioritized by internet user population):
   - **Chinese Simplified (zh)**: ~1.1B speakers
   - **Hindi (hi)**: ~600M speakers
   - **Korean (ko)**: ~80M speakers
   - **Chinese Traditional (zh-TW)**: ~50M speakers
   - **Russian (ru)**: ~250M speakers
   - **Turkish (tr)**: ~80M speakers
   - **Vietnamese (vi)**: ~85M speakers
   - **Thai (th)**: ~70M speakers
   - **Indonesian (id)**: ~200M speakers
   - **Polish (pl)**: ~45M speakers

3. **Also complete the 6 partially-translated languages** (es, fr, de, pt-BR, pt, ja, ar) — fill in missing keys.

4. **Translation quality**: Use natural, idiomatic translations appropriate for a music/radio app context. Not literal word-for-word translations. Keep strings short (UI labels, button text, section headers).

5. **RTL verification**: Ensure Arabic (ar), Persian (fa), and Hebrew (he) translations are correct for RTL layout.

**Boundaries:**
- Do NOT change the i18n architecture or add new dependencies.
- Do NOT add new translatable keys — only provide translations for existing keys.
- Do NOT modify the locale detection or switching logic.
- Maintain the existing `DEEP_MESSAGES` structure pattern in the locale context.
- Keep all translations in the same file (LocaleContext.tsx) following the existing pattern.

## Acceptance Criteria

- [ ] All 42+ message keys translated for zh, hi, ko, zh-TW, ru, tr, vi, th, id, pl.
- [ ] All 42+ message keys completed for es, fr, de, pt-BR, pt, ja, ar.
- [ ] RTL languages (ar, fa, he) have correct translations.
- [ ] No English fallback strings visible when a fully-translated language is selected.
- [ ] TypeScript compiles without errors.
- [ ] `npm run build` passes.
