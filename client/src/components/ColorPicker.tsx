import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useCallback } from "react";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
  "#000000", // black
  "#ffffff", // white
  "#64748b", // slate
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [hexInput, setHexInput] = useState(value.replace("#", ""));
  const gradientRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Convert HSL to Hex
  const hslToHex = (h: number, s: number, l: number): string => {
    const a = (s * Math.min(l, 100 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Convert Hex to HSL
  const hexToHsl = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return [h * 360, s * 100, l * 100];
  };

  // Initialize from external value prop
  useEffect(() => {
    if (!isInitializedRef.current && value && value.length === 7 && value.startsWith("#")) {
      const hex = value.replace("#", "");
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        setHexInput(hex);
        const [h, s, l] = hexToHsl(hex);
        setHue(h);
        setSaturation(s);
        setLightness(l);
        isInitializedRef.current = true;
      }
    }
  }, [value]);

  // Update hex input when HSL changes (but don't call onChange to avoid loops)
  useEffect(() => {
    if (isInitializedRef.current) {
      const hex = hslToHex(hue, saturation, lightness);
      setHexInput(hex.replace("#", ""));
    }
  }, [hue, saturation, lightness]);

  // Call onChange when color changes (debounced via separate effect)
  useEffect(() => {
    if (isInitializedRef.current) {
      const hex = hslToHex(hue, saturation, lightness);
      onChange(hex);
    }
  }, [hue, saturation, lightness, onChange]);

  // Handle hex input changes
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setHexInput(value);

    if (value.length === 6 && /^[0-9A-F]{6}$/.test(value)) {
      const [h, s, l] = hexToHsl(value);
      setHue(h);
      setSaturation(s);
      setLightness(l);
    }
  };

  // Handle gradient click
  const handleGradientClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSaturation(x);
    setLightness(100 - y);
  };

  const currentColor = hslToHex(hue, saturation, lightness);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      {/* Color Gradient Picker */}
      <div
        ref={gradientRef}
        onClick={handleGradientClick}
        className="relative w-full h-40 rounded cursor-crosshair border border-border"
        style={{
          background: `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%)), 
                        linear-gradient(to bottom, transparent, black)`,
        }}
      >
        {/* Picker circle */}
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-2 -translate-y-2"
          style={{
            left: `${saturation}%`,
            top: `${100 - lightness}%`,
          }}
        />
      </div>

      {/* Hue Slider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Matiz</label>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => setHue(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              hsl(0, 100%, 50%), 
              hsl(60, 100%, 50%), 
              hsl(120, 100%, 50%), 
              hsl(180, 100%, 50%), 
              hsl(240, 100%, 50%), 
              hsl(300, 100%, 50%), 
              hsl(360, 100%, 50%))`,
          }}
        />
      </div>

      {/* Saturation Slider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Saturação</label>
        <input
          type="range"
          min="0"
          max="100"
          value={saturation}
          onChange={(e) => setSaturation(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              hsl(${hue}, 0%, ${lightness}%), 
              hsl(${hue}, 100%, ${lightness}%))`,
          }}
        />
      </div>

      {/* Lightness Slider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Brilho</label>
        <input
          type="range"
          min="0"
          max="100"
          value={lightness}
          onChange={(e) => setLightness(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              hsl(${hue}, ${saturation}%, 0%), 
              hsl(${hue}, ${saturation}%, 50%), 
              hsl(${hue}, ${saturation}%, 100%))`,
          }}
        />
      </div>

      {/* Hex Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Código HEX</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              placeholder="FFFFFF"
              maxLength={6}
              className="font-mono text-sm"
            />
          </div>
          <div
            className="w-10 h-10 rounded border border-border"
            style={{ backgroundColor: currentColor }}
          />
        </div>
      </div>

      {/* Preset Colors */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Cores Rápidas</label>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                const hex = color.replace("#", "");
                setHexInput(hex);
                const [h, s, l] = hexToHsl(hex);
                setHue(h);
                setSaturation(s);
                setLightness(l);
              }}
              className="w-full h-8 rounded border-2 border-border hover:border-primary transition-colors"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
