/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import type { MetadataRoute } from 'next';
import { SOVEREIGN_COUNTRY_CODES } from '@/logic/i18n';
import { readStationRoutes } from '@/logic/station-catalog';

const SITE_URL = 'https://www.pulse-radio.online';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
  const countryEntries: MetadataRoute.Sitemap = SOVEREIGN_COUNTRY_CODES.map((countryCode) => ({
    url: `${SITE_URL}/${countryCode}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const stationRoutes = readStationRoutes();
  const stationEntries: MetadataRoute.Sitemap = stationRoutes.map((route) => ({
    url: `${SITE_URL}/${route.countryCode}/stations/${route.stationRef}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...base, ...countryEntries, ...stationEntries];
}
