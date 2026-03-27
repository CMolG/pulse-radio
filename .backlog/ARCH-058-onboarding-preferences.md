---
task_id: ARCH-058
target_agent: auto-feature-engineer-finite
target_module: src/hooks/useOnboardingPreferences.ts
priority: medium
status: pending
---

# Add Genre & Country Selection to Onboarding Flow

## Context

The current onboarding is a 5-step informational walkthrough that tells users about features but doesn't capture any preferences. After onboarding, every user sees the same default genre carousel in the same order. Users must manually explore genres and listen to stations before the app begins to personalize.

Competing apps (Spotify, Apple Music, YouTube Music) all ask users to select genres and artists during onboarding, creating an immediately personalized experience. For a radio app with 40K+ stations across 15 genres, first-run genre selection is critical to avoid overwhelm.

## Directive

1. **Create `src/hooks/useOnboardingPreferences.ts`**:
   ```typescript
   interface OnboardingPreferences {
     selectedGenres: string[];     // From GENRE_CATEGORIES
     selectedCountry: string;      // Auto-detected or manual
     preferredLanguage: string;    // Locale
     completed: boolean;
   }

   function useOnboardingPreferences(): {
     preferences: OnboardingPreferences;
     setGenres: (genres: string[]) => void;
     setCountry: (code: string) => void;
     setLanguage: (locale: string) => void;
     complete: () => void;
     isComplete: boolean;
   }
   ```

2. **Genre selection step**: Insert after the welcome screen in the onboarding flow:
   - Display all 15 genre categories as tappable cards with icons/gradients.
   - Users select 3-5 genres (enforced min 3).
   - Selected genres are stored and used to reorder the home genre carousel.

3. **Country auto-detection step**:
   - Show detected country with flag emoji: "📍 We think you're in [Country]. Show local stations?"
   - Allow manual override with a country picker.

4. **Language preference step** (optional, can be combined):
   - Show a language selector for UI language.
   - Default to browser locale.

5. **Persist preferences** to localStorage. On app load, use selected genres to reorder the genre carousel (integrate with existing `userGenreOrder` logic).

**Boundaries:**
- Do NOT modify the existing onboarding steps — ADD new steps before the final "Let's Go" step.
- Do NOT create new components — define the hook logic only. A separate visual-fixer card will build the UI.
- Use existing `GENRE_CATEGORIES` from constants.
- Integrate with the existing `useStats` genre ordering logic (seed initial preferences).

## Acceptance Criteria

- [ ] Hook captures genre selection, country, and language preferences.
- [ ] Minimum 3 genres enforced.
- [ ] Preferences persist to localStorage.
- [ ] Selected genres are used to seed the genre carousel order.
- [ ] Country auto-detection provides a sensible default.
- [ ] TypeScript compiles without errors.
