import { RotateCcw } from "lucide-react";

import { SHOTS_PER_LEVEL } from "@/game/constants";
import type { NutmegGame } from "@/hooks/useNutmegGame";
import { cn } from "@/lib/utils";

interface LaunchConsoleProps {
  game: NutmegGame;
  onResetPitch: () => void;
}

function ShotPips({ used }: { used: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: SHOTS_PER_LEVEL }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-4 w-4 rounded-full border-[2px] border-ink",
            index < SHOTS_PER_LEVEL - used ? "bg-white" : "bg-ink/25",
          )}
        />
      ))}
    </span>
  );
}

/** Slim status strip: shots left, round reset, and a plunger hint. */
export function LaunchConsole({ game, onResetPitch }: LaunchConsoleProps) {
  return (
    <section className="comic-panel flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col items-center rounded-xl border-[3px] border-ink bg-cream px-2.5 py-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-warmgray">Shots</span>
          <ShotPips used={game.shotsUsed} />
        </div>

        <button
          type="button"
          onClick={onResetPitch}
          className="comic-btn h-11 w-11 bg-white text-ink hover:bg-lemon/40"
          aria-label="Restart the round and pick a new striker"
        >
          <RotateCcw className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      <p className="text-right text-[11px] font-extrabold leading-tight text-warmgray sm:text-sm">
        {game.phase === "flying"
          ? "Ball in play — superpowers are live!"
          : game.phase === "drafting"
            ? "Pick your striker to begin"
            : "Pull the spring plunger on the right edge, release to fire"}
      </p>
    </section>
  );
}
