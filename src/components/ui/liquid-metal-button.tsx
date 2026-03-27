import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  icon?: LucideIcon;
  /** Preset sizes: sm (36px), md (46px), lg (56px) */
  size?: "sm" | "md" | "lg";
  /** Fixed width in px, or "full" for 100% container width */
  width?: number | "full";
  /** Override text color (default: #666) */
  textColor?: string;
  /** Override shader tint — shifts red/blue channels */
  tint?: "neutral" | "green" | "red" | "blue" | "amber";
  /** Disabled state */
  disabled?: boolean;
  className?: string;
}

const TINT_PRESETS = {
  neutral: { r: 0.3, b: 0.3 },
  green: { r: 0.1, b: 0.15 },
  red: { r: 0.6, b: 0.1 },
  blue: { r: 0.1, b: 0.6 },
  amber: { r: 0.5, b: 0.1 },
};

const TEXT_COLORS = {
  neutral: "#888888",
  green: "#4ade80",
  red: "#f87171",
  blue: "#60a5fa",
  amber: "#fbbf24",
};

const SIZE_MAP = {
  sm: 36,
  md: 46,
  lg: 56,
};

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  icon: Icon,
  size = "md",
  width,
  textColor,
  tint = "neutral",
  disabled = false,
  className = "",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleId = useRef(0);

  const h = SIZE_MAP[size];
  const resolvedTextColor = textColor || TEXT_COLORS[tint];
  const tintValues = TINT_PRESETS[tint];

  const dimensions = useMemo(() => {
    if (viewMode === "icon") {
      return { width: h, height: h, innerWidth: h - 4, innerHeight: h - 4, shaderWidth: h, shaderHeight: h };
    }
    const w = typeof width === "number" ? width : 142;
    return { width: w, height: h, innerWidth: w - 4, innerHeight: h - 4, shaderWidth: w, shaderHeight: h };
  }, [viewMode, h, width]);

  const isFullWidth = width === "full";

  useEffect(() => {
    const styleId = "shader-canvas-style-exploded";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes ripple-animation {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    if (shaderRef.current) {
      if (shaderMount.current?.destroy) shaderMount.current.destroy();
      try {
        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_repetition: 4, u_softness: 0.5,
            u_shiftRed: tintValues.r, u_shiftBlue: tintValues.b,
            u_distortion: 0, u_contour: 0, u_angle: 45,
            u_scale: 8, u_shape: 1, u_offsetX: 0.1, u_offsetY: -0.1,
          },
          undefined, 0.6,
        );
      } catch (error) {
        console.error("Shader load failed:", error);
      }
    }
    return () => { shaderMount.current?.destroy?.(); shaderMount.current = null; };
  }, [tintValues.r, tintValues.b]);

  // For full-width: measure container and update shader canvas
  useEffect(() => {
    if (!isFullWidth || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      // Force shader to redraw at new size
      if (shaderRef.current) {
        const w = containerRef.current?.offsetWidth || 200;
        shaderRef.current.style.width = `${w}px`;
        shaderRef.current.style.maxWidth = `${w}px`;
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [isFullWidth]);

  const handleMouseEnter = () => { if (!disabled) { setIsHovered(true); shaderMount.current?.setSpeed?.(1); } };
  const handleMouseLeave = () => { setIsHovered(false); setIsPressed(false); shaderMount.current?.setSpeed?.(0.6); };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    shaderMount.current?.setSpeed?.(2.4);
    setTimeout(() => shaderMount.current?.setSpeed?.(isHovered ? 1 : 0.6), 300);

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
    }
    onClick?.();
  };

  const fontSize = size === "sm" ? "12px" : size === "lg" ? "16px" : "14px";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  const wPx = isFullWidth ? "100%" : `${dimensions.width}px`;
  const hPx = `${dimensions.height}px`;

  return (
    <div ref={containerRef} className={`relative ${isFullWidth ? 'w-full' : 'inline-block'} ${className}`} style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
        <div style={{ position: "relative", width: wPx, height: hPx, transformStyle: "preserve-3d", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: "none" }}>
          {/* Text/Icon layer */}
          <div style={{ position: "absolute", top: 0, left: 0, width: wPx, height: hPx, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transformStyle: "preserve-3d", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: "translateZ(20px)", zIndex: 30, pointerEvents: "none" }}>
            {Icon && <Icon size={iconSize} style={{ color: resolvedTextColor, filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.5))", transition: "all 0.3s ease" }} />}
            {viewMode === "text" && label && (
              <span style={{ fontSize, color: resolvedTextColor, fontWeight: 500, textShadow: "0px 1px 2px rgba(0,0,0,0.5)", whiteSpace: "nowrap", transition: "all 0.3s ease" }}>{label}</span>
            )}
          </div>

          {/* Inner dark layer */}
          <div style={{ position: "absolute", top: 0, left: 0, width: wPx, height: hPx, transformStyle: "preserve-3d", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)"}`, zIndex: 20 }}>
            <div style={{ width: isFullWidth ? "calc(100% - 4px)" : `${dimensions.innerWidth}px`, height: `${dimensions.innerHeight}px`, margin: "2px", borderRadius: "100px", background: "linear-gradient(180deg, #202020 0%, #000000 100%)", boxShadow: isPressed ? "inset 0px 2px 4px rgba(0,0,0,0.4)" : "none", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease" }} />
          </div>

          {/* Shader layer */}
          <div style={{ position: "absolute", top: 0, left: 0, width: wPx, height: hPx, transformStyle: "preserve-3d", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)"}`, zIndex: 10 }}>
            <div style={{ height: hPx, width: wPx, borderRadius: "100px", boxShadow: isPressed ? "0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)" : isHovered ? "0 0 0 1px rgba(0,0,0,0.4), 0 8px 5px rgba(0,0,0,0.1), 0 4px 4px rgba(0,0,0,0.15)" : "0 0 0 1px rgba(0,0,0,0.3), 0 9px 9px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.15)", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease", background: "transparent" }}>
              <div ref={shaderRef} className="shader-container-exploded" style={{ borderRadius: "100px", overflow: "hidden", position: "relative", width: wPx, maxWidth: wPx, height: hPx, transition: "width 0.4s ease" }} />
            </div>
          </div>

          {/* Invisible click target */}
          <button ref={buttonRef} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={() => !disabled && setIsPressed(true)} onMouseUp={() => setIsPressed(false)} style={{ position: "absolute", top: 0, left: 0, width: wPx, height: hPx, background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer", outline: "none", zIndex: 40, transformStyle: "preserve-3d", transform: "translateZ(25px)", overflow: "hidden", borderRadius: "100px" }} aria-label={label}>
            {ripples.map((r) => (
              <span key={r.id} style={{ position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: "20px", height: "20px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)", pointerEvents: "none", animation: "ripple-animation 0.6s ease-out" }} />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}
