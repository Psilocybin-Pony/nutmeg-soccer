import { Trophy, Volume2, VolumeX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { isMuted, toggleMuted } from "@/game/audio";

interface TopBarProps {
  bestScore: number;
  children?: ReactNode;
}

function BallMark() {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-white">
      <span className="absolute h-3 w-3 rounded-[3px] bg-ink" style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }} />
      <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-ink" />
      <span className="absolute bottom-1 right-1.5 h-1.5 w-1.5 rounded-full bg-ink" />
    </span>
  );
}

/** Shared site header: wordmark, best score, and page-specific controls. */
export function TopBar({ bestScore, children }: TopBarProps) {
  const [muted, setMuted] = useState<boolean>(isMuted());

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 rounded-[20px] border-[3px] border-ink bg-cream/95 px-3 py-2 shadow-comic backdrop-blur sm:px-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl px-1 py-0.5 transition-transform hover:-rotate-1"
          aria-label="Nutmeg Soccer Pinball home"
        >
          <BallMark />
          <span className="flex flex-col leading-none">
            <span className="font-display text-2xl tracking-wide text-lemon comic-text-shadow sm:text-3xl">NUTMEG</span>
            <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-warmgray sm:block">
              Soccer Pinball
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMuted(toggleMuted())}
            className="comic-btn h-10 w-10 shrink-0 bg-white text-ink hover:bg-cream"
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            aria-pressed={muted}
          >
            {muted ? (
              <VolumeX className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Volume2 className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            )}
          </button>
          {children}
          <span className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-3 py-1.5 shadow-comic-sm">
            <Trophy className="h-4 w-4 text-lemon" strokeWidth={3} aria-hidden="true" />
            <span className="text-sm font-extrabold text-ink sm:text-base">
              <span className="hidden sm:inline">Best: </span>
              {bestScore.toLocaleString()}
              <span className="hidden sm:inline"> pts</span>
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
