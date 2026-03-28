import React from "react";
import type { LiquidGlassButtonProps } from "../types";

export const LiquidGlassButton = React.memo(function LiquidGlassButton({
                                                                           onClick,
                                                                           disabled,
                                                                           className = '',
                                                                           children,
                                                                           ...rest
                                                                       }: LiquidGlassButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`liquid-glass rounded-full ${className}`}
            {...rest}
        >
            <div className="liquid-glass-effect rounded-full" />
            <div className="liquid-glass-tint rounded-full" />
            <div className="liquid-glass-shine rounded-full" />
            <div className="liquid-glass-content">{children}</div>
        </button>
    );
});