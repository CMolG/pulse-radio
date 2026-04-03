import { ImageResponse } from 'next/og';

export const alt = 'Pulse Radio — Free Internet Radio with Visualizer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
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
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: 16,
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
          marginBottom: 8,
        }}
      >
        Free Internet Radio with Visualizer
      </div>
      <div
        style={{
          fontSize: 20,
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
        }}
      >
        Stream thousands of stations worldwide
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 40,
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
    </div>,
    { ...size },
  );
}
