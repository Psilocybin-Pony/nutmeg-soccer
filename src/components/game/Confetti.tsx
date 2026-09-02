import { useMemo, type CSSProperties } from "react";

const COLORS = ["#FFC93C", "#FF7A1A", "#E23B3B", "#3BA7E0", "#58B368", "#FFFFFF"];

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  color: string;
  width: number;
  height: number;
}

/** Purely decorative confetti burst for the goal celebration. */
export function Confetti({ count = 64 }: { count?: number }) {
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        left: (index * 97) % 100,
        delay: Math.random() * 0.9,
        duration: 2.1 + Math.random() * 1.9,
        drift: (Math.random() - 0.5) * 260,
        spin: 360 + Math.random() * 900,
        color: COLORS[index % COLORS.length],
        width: 8 + Math.random() * 8,
        height: 12 + Math.random() * 12,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            "--drift": `${piece.drift}px`,
            "--spin": `${piece.spin}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
