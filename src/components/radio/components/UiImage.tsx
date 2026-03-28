import Image from "next/image";
import React from "react";
import type { UiImageProps } from "./types";

export function UiImage({
                            src,
                            alt,
                            className,
                            sizes = '100vw',
                            priority,
                            loading,
                            onError,
                            style,
                        }: UiImageProps) {
    return (
        <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes={sizes}
            className={className}
            priority={priority}
            loading={loading}
            onError={onError}
            style={style}
        />
    );
}