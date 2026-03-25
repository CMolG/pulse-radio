/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
"use client";
import Image from "next/image";
type UiImageProps = { src: string; alt: string; className?: string; sizes?: string;
  priority?: boolean; loading?: "lazy" | "eager"; onError?: () => void; style?: React.CSSProperties; };
export default function UiImage({ src, alt, className, sizes = "100vw", priority, loading, onError, style,
}: UiImageProps) { return ( <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={className}
      priority={priority}
      loading={loading}
      onError={onError}
      style={style} />
  ); }
