/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
import type { SupportedLocale } from "./locales";
const BASE_MESSAGES = {
  topStations: "Top Stations", loadingStations: "Loading…", stationCount: "{count} stations", discovery: "Discovery",
  discoveryOn: "ON", discoveryModeAria: "Discovery mode",
  discoveryModeTitle: "Auto-play a random station every 30 seconds", all: "All",
  allCountries: "All", favorites: "Favorites", recent: "Recent", discover: "Discover",
  history: "History", searchStations: "Search stations…",
  searchStationsAria: "Search stations", searchResultLabel: "Search: \"{query}\"",
  retry: "Retry", failedToLoad: "Failed to load",
  noStationsFound: "No stations found", failedToLoadStations: "Failed to load stations",
  scanNowPlaying: "Scan now playing", scanningProgress: "Scanning {current}/{total}…",
  nowPlayingProgress: "Now playing ({current}/{total})", filterBySong: "Filter by song or artist…",
  previous: "Prev", next: "Next",
  pageFraction: "{current} / {total}", autoAudioEnhancements: "Audio enhancements applied:",
  minimize: "Minimize", expand: "Expand", noiseReduction: "Noise Reduction", audioNormalizer: "Audio Normalizer",
  equalizer: "Equalizer", presetLabel: "Preset: {name}",
  internetRadio: "Internet Radio", offlineBanner: "You are offline — playback may be interrupted",
  addToFavorites: "Add to favorites", removeFromFavorites: "Remove from favorites",
  genreTrending: "Trending", genrePop: "Pop", genreRock: "Rock", genreJazz: "Jazz",
  genreClassical: "Classical", genreElectronic: "Electronic", genreHiphop: "Hip-Hop", genreCountry: "Country",
  genreAmbient: "Ambient", genreLofi: "Lo-Fi", genreNews: "News", genreLatin: "Latin",
  genreMetal: "Metal", genreLocal: "Local", genreWorld: "World", seeMore: "See more",
} as const;
export type MessageKey = keyof typeof BASE_MESSAGES;
export type MessageBundle = Record<MessageKey, string>;
const DEEP_MESSAGES: Partial<Record<SupportedLocale, Partial<MessageBundle>>> = { es: {
    topStations: "Top Stations", loadingStations: "Cargando…", stationCount: "{count} emisoras", discovery: "Descubrir",
    all: "Todo", allCountries: "Todos", favorites: "Favoritos", recent: "Recientes",
    discover: "Descubrir", history: "Historial",
    searchStations: "Buscar emisoras…", searchStationsAria: "Buscar emisoras",
    searchResultLabel: "Búsqueda: \"{query}\"", retry: "Reintentar",
    failedToLoad: "Error de carga", noStationsFound: "No se encontraron emisoras",
    failedToLoadStations: "Error al cargar", scanNowPlaying: "Escanear en directo",
    filterBySong: "Filtrar por canción o artista…", previous: "Anterior",
    next: "Siguiente", autoAudioEnhancements: "Mejoras de audio aplicadas:",
    offlineBanner: "Estás sin conexión — la reproducción puede interrumpirse", addToFavorites: "Añadir a favoritos",
    removeFromFavorites: "Quitar de favoritos", genreTrending: "Tendencia",
    genreClassical: "Clásica", genreElectronic: "Electrónica", genreNews: "Noticias", genreLatin: "Latina",
    genreLocal: "Local", minimize: "Minimizar", expand: "Expandir", seeMore: "Ver más",
  }, fr: { loadingStations: "Chargement…", stationCount: "{count} stations", allCountries: "Tous", favorites: "Favoris",
    recent: "Récents", discover: "Découvrir", history: "Historique", searchStations: "Rechercher des stations…",
    searchStationsAria: "Rechercher des stations", retry: "Réessayer",
    failedToLoad: "Échec du chargement", noStationsFound: "Aucune station trouvée", previous: "Préc.", next: "Suiv.",
    addToFavorites: "Ajouter aux favoris", removeFromFavorites: "Retirer des favoris",
    minimize: "Réduire", expand: "Agrandir",
  }, de: { loadingStations: "Laden…", stationCount: "{count} Sender", allCountries: "Alle", favorites: "Favoriten",
    recent: "Zuletzt", discover: "Entdecken", history: "Verlauf", searchStations: "Sender suchen…",
    searchStationsAria: "Sender suchen", retry: "Erneut versuchen",
    failedToLoad: "Laden fehlgeschlagen", noStationsFound: "Keine Sender gefunden", previous: "Zurück", next: "Weiter",
    addToFavorites: "Zu Favoriten hinzufügen", removeFromFavorites: "Aus Favoriten entfernen",
    minimize: "Minimieren", expand: "Erweitern",
  },
  "pt-BR": {
    loadingStations: "Carregando…", stationCount: "{count} estações", allCountries: "Todos", favorites: "Favoritos",
    recent: "Recentes", discover: "Descobrir", history: "Histórico", searchStations: "Buscar estações…",
    searchStationsAria: "Buscar estações", retry: "Tentar novamente",
    failedToLoad: "Falha ao carregar", noStationsFound: "Nenhuma estação encontrada",
    previous: "Anterior", next: "Próximo", minimize: "Minimizar", expand: "Expandir",
  },
  pt: { loadingStations: "A carregar…", stationCount: "{count} estações", allCountries: "Todos", favorites: "Favoritos",
    recent: "Recentes", discover: "Descobrir", history: "Histórico", searchStations: "Pesquisar estações…",
    searchStationsAria: "Pesquisar estações", retry: "Tentar novamente",
    failedToLoad: "Falha ao carregar", noStationsFound: "Nenhuma estação encontrada",
    previous: "Anterior", next: "Seguinte", minimize: "Minimizar", expand: "Expandir",
  }, ja: { loadingStations: "読み込み中…", stationCount: "{count} 局", allCountries: "すべて", favorites: "お気に入り",
    recent: "最近", discover: "発見", history: "履歴", searchStations: "ラジオ局を検索…",
    searchStationsAria: "ラジオ局を検索", retry: "再試行", failedToLoad: "読み込みに失敗しました", noStationsFound: "局が見つかりません",
    previous: "前へ", next: "次へ", minimize: "最小化", expand: "展開",
  }, ar: { loadingStations: "جارٍ التحميل…", stationCount: "{count} محطة", allCountries: "الكل", favorites: "المفضلة",
    recent: "الأخيرة", discover: "اكتشاف", history: "السجل", searchStations: "ابحث عن المحطات…",
    searchStationsAria: "ابحث عن المحطات", retry: "إعادة المحاولة",
    failedToLoad: "فشل التحميل", noStationsFound: "لم يتم العثور على محطات", previous: "السابق", next: "التالي",
    minimize: "تصغير", expand: "توسيع",
  },
};
function mergeBundle(locale: SupportedLocale): MessageBundle {
  const patch = DEEP_MESSAGES[locale] ?? {}; return { ...BASE_MESSAGES, ...patch }; }
const MESSAGE_CACHE: Partial<Record<SupportedLocale, MessageBundle>> = {};
export function getMessages(locale: SupportedLocale): MessageBundle {
  if (!MESSAGE_CACHE[locale]) MESSAGE_CACHE[locale] = mergeBundle(locale);
  return MESSAGE_CACHE[locale] as MessageBundle; }
export function translate(locale: SupportedLocale, key: MessageKey, vars?: Record<string, string | number>): string {
  const message = getMessages(locale)[key] ?? BASE_MESSAGES[key]; if (!vars) return message;
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token: string) => {
    const val = vars[token]; return val === undefined || val === null ? `{${token}}` : String(val);});
}
