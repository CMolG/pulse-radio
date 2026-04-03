#!/usr/bin/env node
/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * SEO audit for Pulse Radio.
 * Run after `next build` to verify key SEO requirements on pre-rendered pages.
 *
 * Usage: node scripts/seo-audit.js
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const cheerio = require('cheerio');

const BUILD_DIR = path.resolve(__dirname, '..', '.next', 'server', 'app');
const SRC_DIR = path.resolve(__dirname, '..', 'src', 'app');

let errors = 0;
let warnings = 0;

function error(msg) {
  errors++;
  console.error(`  \u274C ${msg}`);
}
function warn(msg) {
  warnings++;
  console.warn(`  \u26A0\uFE0F  ${msg}`);
}
function pass(msg) {
  console.log(`  \u2705 ${msg}`);
}

function routeFromFile(file) {
  const r = '/' + file.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/^\//, '');
  return r === '/' ? '/' : r;
}

function auditHtml(filePath, route) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);
  const isNotFound = route.includes('not-found') || route.includes('_not-found');
  const isGlobalError = route.includes('_global-error');

  // _global-error is a special Next.js boundary that replaces the entire page;
  // it intentionally lacks layout metadata, so skip it.
  if (isGlobalError) {
    console.log(`\n\uD83D\uDCC4 ${route} (skipped — Next.js internal)`);
    return;
  }

  console.log(`\n\uD83D\uDCC4 ${route}`);

  // lang attribute
  const lang = $('html').attr('lang');
  lang ? pass(`lang="${lang}"`) : error('Missing lang attribute on <html>');

  // Title
  const title = $('title').text();
  title ? pass(`<title> (${title.length} chars)`) : error('Missing <title>');

  // Meta description
  const desc = $('meta[name="description"]').attr('content');
  if (desc && desc.length >= 50) {
    pass(`meta description (${desc.length} chars)`);
  } else if (desc) {
    warn(`meta description short (${desc.length} chars)`);
  } else if (!isNotFound) {
    error('Missing meta description');
  }

  // h1
  const h1Count = $('h1').length;
  if (h1Count === 1) pass('Single <h1>');
  else if (h1Count === 0) error('No <h1> found');
  else warn(`${h1Count} <h1> tags`);

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) pass(`canonical: ${canonical}`);
  else if (!isNotFound) warn('Missing canonical link');

  // OG tags (skip for not-found pages)
  if (!isNotFound) {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    ogTitle ? pass('og:title') : error('Missing og:title');
    ogDesc ? pass('og:description') : error('Missing og:description');
  }

  // Twitter card
  const twitterCard = $('meta[name="twitter:card"]').attr('content');
  if (twitterCard === 'summary_large_image') {
    pass('twitter:card = summary_large_image');
  } else if (twitterCard) {
    warn(`twitter:card = "${twitterCard}" (prefer summary_large_image)`);
  }
}

async function main() {
  console.log('\uD83D\uDD0D Pulse Radio SEO Audit\n');

  if (!fs.existsSync(BUILD_DIR)) {
    console.error('Build output not found. Run `npm run build` first.');
    process.exit(1);
  }

  // Audit pre-rendered HTML pages
  const htmlFiles = await glob('**/*.html', { cwd: BUILD_DIR });
  console.log(`Found ${htmlFiles.length} pre-rendered page(s).`);

  for (const file of htmlFiles.sort()) {
    auditHtml(path.join(BUILD_DIR, file), routeFromFile(file));
  }

  // Structural checks
  console.log('\n\uD83E\uDD16 Structural checks');

  // robots.ts exists (not static robots.txt)
  const staticRobots = path.resolve(__dirname, '..', 'public', 'robots.txt');
  const dynamicRobots = path.join(SRC_DIR, 'robots.ts');
  if (fs.existsSync(staticRobots)) warn('Static public/robots.txt found — should use dynamic robots.ts');
  fs.existsSync(dynamicRobots) ? pass('src/app/robots.ts') : error('Missing robots.ts');

  // sitemap.ts
  fs.existsSync(path.join(SRC_DIR, 'sitemap.ts'))
    ? pass('src/app/sitemap.ts')
    : error('Missing sitemap.ts');

  // not-found.tsx
  fs.existsSync(path.join(SRC_DIR, 'not-found.tsx'))
    ? pass('src/app/not-found.tsx')
    : error('Missing not-found.tsx');

  // opengraph-image
  fs.existsSync(path.join(SRC_DIR, 'opengraph-image.tsx'))
    ? pass('src/app/opengraph-image.tsx')
    : error('Missing opengraph-image.tsx');

  // Security headers in next.config.ts
  const config = fs.readFileSync(path.resolve(__dirname, '..', 'next.config.ts'), 'utf-8');
  for (const header of ['Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options']) {
    config.includes(header) ? pass(`${header} header`) : error(`Missing ${header}`);
  }

  // Summary
  console.log('\n' + '\u2500'.repeat(50));
  if (errors === 0) {
    console.log(`\u2705 Passed \u2014 ${warnings} warning(s), 0 errors.\n`);
  } else {
    console.log(`\u274C Failed \u2014 ${errors} error(s), ${warnings} warning(s).\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
