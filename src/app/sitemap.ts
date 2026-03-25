/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { MetadataRoute } from "next"; import { SOVEREIGN_COUNTRY_CODES } from "@/lib/i18n/countries"; export default function sitemap(): MetadataRoute.Sitemap {
  const base: MetadataRoute.Sitemap = [{ url: "https://www.pulse-radio.online", lastModified: new Date(), changeFrequency: "weekly", priority: 1 }]; const countryEntries: MetadataRoute.Sitemap = SOVEREIGN_COUNTRY_CODES.map((countryCode) => ({
    url: `https://www.pulse-radio.online/${countryCode}`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9,
  })); return [...base, ...countryEntries]; }
