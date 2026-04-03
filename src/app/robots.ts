import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: [
          'AhrefsBot',
          'Amazonbot',
          'anthropic-ai',
          'Applebot-Extended',
          'AwarioRssBot',
          'AwarioSmartBot',
          'Barkrowler',
          'BLEXBot',
          'Bytespider',
          'CCBot',
          'ChatGPT-User',
          'ClaudeBot',
          'cohere-ai',
          'DataForSeoBot',
          'Diffbot',
          'DotBot',
          'Googlebot-Image',
          'GPTBot',
          'Google-Extended',
          'ImagesiftBot',
          'magpie-crawler',
          'Meltwater',
          'MJ12bot',
          'omgili',
          'peer39_crawler',
          'PetalBot',
          'Seekr',
          'SemrushBot',
          'serpstatbot',
          'YouBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: 'https://www.pulse-radio.online/sitemap.xml',
  };
}
