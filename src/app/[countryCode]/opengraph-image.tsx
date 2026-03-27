import { ImageResponse } from 'next/og';
import { COUNTRY_BY_CODE, SOVEREIGN_COUNTRY_CODES } from '@/lib/i18n';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return SOVEREIGN_COUNTRY_CODES.map((countryCode) => ({ countryCode }));
}

function getFlagEmoji(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  return [...cc].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ countryCode: string }>;
}) {
  const { countryCode } = await params;
  const cc = countryCode.toUpperCase();
  const country = COUNTRY_BY_CODE[cc];
  const countryName = country?.name || cc;
  const flag = getFlagEmoji(cc);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1a2e 50%, #16213e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 96, marginBottom: 16, display: 'flex' }}>{flag}</div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 12,
            display: 'flex',
          }}
        >
          Pulse Radio
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.7)',
            display: 'flex',
          }}
        >
          Listen to radio in {countryName}
        </div>
        {/* decorative wave lines */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 32,
            alignItems: 'flex-end',
          }}
        >
          {[20, 35, 50, 65, 50, 35, 20, 40, 55, 40, 25].map((h, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: h,
                borderRadius: 3,
                background: `rgba(52, 199, 89, ${0.4 + (h / 65) * 0.6})`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
