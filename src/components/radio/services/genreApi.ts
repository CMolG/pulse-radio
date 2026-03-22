/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

const GENRE_API = 'https://binaryjazz.us/wp-json/genrenator/v1';

export async function randomGenreStory(): Promise<string | null> {
  try {
    const res = await fetch(`${GENRE_API}/story/`);
    if (!res.ok) return null;
    const text = await res.json();
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

export async function randomGenreName(): Promise<string | null> {
  try {
    const res = await fetch(`${GENRE_API}/genre/`);
    if (!res.ok) return null;
    const text = await res.json();
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}
