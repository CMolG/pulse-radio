# Tech Proposal: Degradación adaptativa en dispositivos sin aceleración hardware

**Estado:** Propuesta — sin implementar
**Fecha:** 2026-03-24
**Alcance:** `src/lib/audio-visualizer/`, `src/components/radio/`, `src/app/globals.css`

---

## Problema

En dispositivos de gama baja o sin GPU dedicada (móviles viejos, PWA en iPad 1st gen, modo de bajo consumo, etc.) varias partes de la UI degradan significativamente el rendimiento:

- **FerrofluidRenderer**: metaballs con CSS `filter: blur()` + ImageData read-back cada frame → muy costoso en software rendering
- **SpiralRenderer**: 250 barras con gradiente de 3 colores en espiral logarítmica → alto CPU por frame
- **Animaciones CSS pesadas**: `ambient-drift` (15 s, parallax), `float-particle`, `thin-film-shift`, `tempered-steel-shift` → componen layers GPU aunque no haya GPU real
- **ParallaxBackground**: `willChange: 'transform'` + `translate3d` fuerzan composite layers que sin GPU van a software

Sin un modo degradado, estos dispositivos experimentan: pantalla entrecortada, batería agotada rápidamente, calentamiento y posible crash del tab.

---

## Inventario: pesado vs ligero

### Pesado — eliminar o sustituir sin aceleración

| Elemento | Archivo | Por qué pesa |
|---|---|---|
| `FerrofluidRenderer` | `audio-visualizer/FerrofluidRenderer.tsx` | `filter:blur` en canvas + `getImageData` read-back + renderizado a 1/3 resolución upscaled |
| `SpiralRenderer` | `audio-visualizer/SpiralRenderer.tsx` | 250 `fillRect` + 3-stop gradient recalculado por frame |
| `CircularRenderer` | `audio-visualizer/CircularRenderer.tsx` | trailing fade vía `fillRect` semitransparente + gradiente dinámico |
| `ParallaxBackground` | `components/radio/components/ParallaxBackground.tsx` | composite layer forzado, transformaciones 3D continuas |
| `ambient-drift` (CSS) | `globals.css:530` | `transform: scale + translate` 15 s loop en el fondo |
| `float-particle` (CSS) | `globals.css:724` | múltiples pseudo-elementos animando translateX+Y |
| `thin-film-shift` (CSS) | `globals.css:1069` | `background-position` shift 8 s en gradiente de alta complejidad |
| `tempered-steel-shift` (CSS) | `globals.css:1105` | similar a thin-film, 7 s |

### Ligero — conservar siempre

| Elemento | Por qué es aceptable |
|---|---|
| `VisualizerCanvas` (modo `bars` o `wave`) | Canvas 2D plano, sin blur, sin gradiente dinámico, sin read-back |
| `AnimatedBars` (CSS EQ bars) | Sólo `height` en 3-4 elementos, ya tiene `prefers-reduced-motion` |
| `fade-in`, `dropdown-in`, `weather-fade-in` | Opacidad + translate cortos (150–300 ms), un solo frame compuesto |
| `skeleton-shimmer` / `shimmer` | Translate en pseudo-elemento, no bloquea paint |
| `bounce`, `popIn`, `scaleIn`, `slideDown`, `slideInRight` | Feedback UI puntual, no son loops |
| `flipIn` / `shake` (word puzzle) | Animaciones discretas, no continuas |

---

## Estrategia de detección

Usar **detección progresiva en runtime**, no user-agent. Componer una puntuación de capacidad al arrancar la app:

### Señales primarias (deterministas)

| Señal | API | Umbral "sin aceleración" |
|---|---|---|
| Núcleos lógicos | `navigator.hardwareConcurrency` | `< 4` |
| Memoria de dispositivo | `navigator.deviceMemory` | `< 4` (GB) |
| Preferencia del SO | `prefers-reduced-motion: reduce` | Siempre degradar |
| DPR bajo | `window.devicePixelRatio` | `≤ 1` en combinación con otros factores |

### Señal secundaria (medición en vivo)

Medir el framerate real durante los primeros 2 segundos de animación canvas activa. Si el promedio cae por debajo de **40 fps** → activar modo degradado automáticamente, sin reinicio.

```
frameRateSampler:
  - acumular deltas de rAF los primeros 60 frames
  - si mediana < 40 fps → triggerLowPerfMode()
```

### Señal terciaria (capacidades de API)

| Capacidad ausente | Implicación |
|---|---|
| `OffscreenCanvas` no disponible | Pipeline GPU no moderno |
| `createImageBitmap` no disponible | Probable software rendering |
| `CSS.supports('backdrop-filter', 'blur(1px)')` → false | Sin GPU compositing |

### Resultado: `usePerformanceTier` hook

```ts
type PerformanceTier = 'full' | 'reduced' | 'minimal'
```

| Tier | Condición | Descripción |
|---|---|---|
| `full` | Todos los checks verdes | Experiencia completa |
| `reduced` | 1-2 señales débiles | Sin ParallaxBackground + VisualizerCanvas simple en lugar de Ferrofluid/Spiral |
| `minimal` | prefers-reduced-motion O detección muy baja | Sin canvas, sin loops CSS, sólo AnimatedBars estático |

El tier se persiste en `sessionStorage` para no re-medir en cada navegación. El usuario puede forzarlo manualmente desde ajustes (override).

---

## Cambios por componente

### `usePerformanceTier.ts` (nuevo hook)

- Lee `navigator.hardwareConcurrency`, `deviceMemory`, `prefers-reduced-motion`
- Expone `tier: PerformanceTier` y `override(tier)`
- Inicia el frame-rate sampler y actualiza tier si cae < 40 fps

### `audioSourceCache.ts` / `index.ts` (audio-visualizer)

Sin cambios. La lógica de qué renderer montar la decide el componente padre.

### `NowPlayingBar.tsx`

- `tier === 'full'` → `FerrofluidRenderer` (actual)
- `tier === 'reduced' | 'minimal'` → `VisualizerCanvas mode="bars"` (sin gradiente animado)

### `TheaterView.tsx`

- `tier === 'full'` → `SpiralRenderer` (actual)
- `tier === 'reduced'` → `VisualizerCanvas mode="wave"` con color estático
- `tier === 'minimal'` → sin canvas, fondo estático con artwork de la estación

### `ParallaxBackground.tsx`

- `tier !== 'full'` → renderiza `null` o un `<div>` estático con el mismo color de fondo pero sin `willChange` ni transforms

### `globals.css`

Añadir clase `.perf-reduced` en `<html>` cuando `tier !== 'full'`:

```css
.perf-reduced .ambient-drift,
.perf-reduced .float-particle,
.perf-reduced [class*="thin-film"],
.perf-reduced [class*="tempered-steel"] {
  animation: none !important;
  background-position: 0 0 !important;
}
```

Esto complementa el `prefers-reduced-motion` ya existente en línea 311.

### Settings UI

Añadir en el panel de ajustes un control:

```
Calidad visual:  [Automático ▾]
                  Completa
                  Reducida
                  Mínima
```

Que llame a `override(tier)` del hook, persiste en `localStorage`.

---

## Lo que NO cambia

- Toda la lógica de audio (`useRadio`, `useEqualizer`, `useAudioAnalyser`) — el rendimiento de audio es independiente de la visualización
- `AnimatedBars` — ya es ligero y ya tiene `prefers-reduced-motion`
- Transiciones CSS cortas (fade, slide, pop) — no tienen impacto medible
- La arquitectura de `VisualizerCanvas` — ya está preparada para ser el fallback

---

## Riesgos y consideraciones

| Riesgo | Mitigación |
|---|---|
| Falsos positivos en la detección (iPad Pro detectado como bajo) | Override manual en ajustes |
| Cambio de tier en vivo durante reproducción puede causar flash | Sólo cambiar tier entre canciones o en pausa |
| `deviceMemory` no disponible en Firefox/Safari | Tratar como `undefined` → no penalizar, esperar framerate real |
| Frame-rate sampler aumenta CPU en el arranque | Limitar a 60 frames (≈ 1 s a 60 fps), luego desactivar |

---

## Ficheros afectados (resumen)

```
src/lib/audio-visualizer/
  usePerformanceTier.ts          ← NUEVO
  index.ts                       ← exportar usePerformanceTier

src/components/radio/components/
  NowPlayingBar.tsx              ← swap renderer por tier
  TheaterView.tsx                ← swap renderer por tier
  ParallaxBackground.tsx         ← null cuando tier != full

src/app/
  globals.css                    ← clase .perf-reduced
  layout.tsx o RadioShell.tsx    ← aplicar clase .perf-reduced al <html>

src/components/radio/
  [SettingsPanel].tsx            ← control de override de tier
```

---

## Criterios de aceptación

- [ ] En Chrome DevTools → Rendering → "Disable hardware acceleration": la app carga sin jank visible
- [ ] `prefers-reduced-motion: reduce` → tier `minimal` automático, sin canvas loops
- [ ] `navigator.hardwareConcurrency = 2` mock → tier `reduced` activo
- [ ] Override manual en ajustes persiste entre sesiones
- [ ] En dispositivo real de gama baja (o iPhone con modo de bajo consumo): 60 fps sostenidos en `NowPlayingBar`
- [ ] Sin regresión en Playwright `mobile-chrome` para los componentes afectados
