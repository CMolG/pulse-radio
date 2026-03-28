import { useState, useCallback } from 'react';

const STORAGE_KEY = 'radio-onboarding-prefs';
const MIN_GENRES = 3;

export interface OnboardingPreferences {
  selectedGenres: string[];
  selectedCountry: string;
  preferredLanguage: string;
  completed: boolean;
}

const DEFAULT_PREFS: OnboardingPreferences = {
  selectedGenres: [],
  selectedCountry: '',
  preferredLanguage: '',
  completed: false,
};

function loadPrefs(): OnboardingPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: OnboardingPreferences) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Detect country from browser timezone/locale */
function detectCountry(): string {
  if (typeof navigator === 'undefined') return '';
  const locale = navigator.language || '';
  const parts = locale.split('-');
  return parts.length >= 2 ? parts[1].toUpperCase() : '';
}

export function useOnboardingPreferences() {
  const [preferences, setPreferences] = useState<OnboardingPreferences>(loadPrefs);

  const update = useCallback((partial: Partial<OnboardingPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  const setGenres = useCallback(
    (genres: string[]) => update({ selectedGenres: genres }),
    [update],
  );

  const setCountry = useCallback(
    (code: string) => update({ selectedCountry: code }),
    [update],
  );

  const setLanguage = useCallback(
    (locale: string) => update({ preferredLanguage: locale }),
    [update],
  );

  const complete = useCallback(() => update({ completed: true }), [update]);

  const detectedCountry = detectCountry();

  return {
    preferences,
    setGenres,
    setCountry,
    setLanguage,
    complete,
    isComplete: preferences.completed,
    isGenreSelectionValid: preferences.selectedGenres.length >= MIN_GENRES,
    detectedCountry,
    MIN_GENRES,
  };
}
