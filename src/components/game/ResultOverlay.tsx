import { ArrowLeft, Play, RotateCcw, Trophy, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Confetti } from "@/components/game/Confetti";
import { SHOTS_PER_LEVEL } from "@/game/constants";
import type { LevelConfig } from "@/game/levels";
import { nextDifficulty } from "@/game/levels";
import type { ShotSummary } from "@/game/types";

interface ResultOverlayProps {
  level: LevelConfig;
  outcome: "scored" | "failed";
  shot: ShotSummary | null;
  score: number;
  shotsUsed: number;
  onReplay: () => void;
  onDismiss: () => void;
}

/** Full-screen celebration (or commiseration) shown when a level ends. */
export function ResultOverlay({
  level,
  outcome,
  shot,
  score,
  shotsUsed,
  onReplay,
  onDismiss,
}: ResultOverlayProps) {
  const scored = outcome === "scored";
  const upNext = nextDifficulty(level.id);
  const goals = scored ? 1 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={scored ? "Goal scored" : "Out of shots"}
    >
      {scored ? <Confetti /> : null}

      <div className="comic-panel relative w-full max-w-[720px] overflow-hidden animate-pop-in">
        <button
          type="button"
          onClick={onDismiss}
          className="comic-btn absolute right-3 top-3 z-10 h-10 w-10 bg-white text-ink"
          aria-label="Close and stay on the pitch"
        >
          <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>

        <div
          className="relative flex h-[190px] items-center justify-center overflow-hidden border-b-[3px] border-ink sm:h-[240px]"
          style={{
            background: scored
              ? "repeating-linear-gradient(90deg, #58B368 0 56px, #6BC27A 56px 112px)"
              : "repeating-linear-gradient(90deg, #4E8F5C 0 56px, #5C9E69 56px 112px)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-2/3 opacity-70"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55), transparent 62%)",
            }}
          />
          <h2
            className="relative animate-slam-in font-display text-[64px] leading-none text-lemon comic-stroke sm:text-[104px]"
            style={{ filter: "drop-shadow(6px 8px 0 rgba(0,0,0,0.35))" }}
          >
            {scored ? "GOAL!" : "SAVED!"}
          </h2>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-ink bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3">
              <Trophy className="h-7 w-7 shrink-0 text-lemon" strokeWidth={3} aria-hidden="true" />
              <span className="font-display text-2xl text-ink sm:text-3xl">
                {scored ? `${shot?.placement ?? "Goal"} · ` : "Total · "}
                {score.toLocaleString()} pts
              </span>
            </span>
            <span className="text-sm font-extrabold text-warmgray sm:text-base">
              {shotsUsed} of {SHOTS_PER_LEVEL} shots · {goals} goal · {shot?.hits ?? 0} bumper hits
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onReplay}
              className="comic-btn h-14 flex-1 bg-lemon font-display text-2xl text-ink"
            >
              <RotateCcw className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
              Replay
            </button>

            {scored && upNext ? (
              <Link
                to={`/play/${upNext}`}
                className="comic-btn h-14 flex-1 bg-tangerine font-display text-2xl text-white"
              >
                <Play className="h-6 w-6 fill-white" strokeWidth={3} aria-hidden="true" />
                Next Level
              </Link>
            ) : (
              <Link to="/" className="comic-btn h-14 flex-1 bg-tangerine font-display text-2xl text-white">
                <ArrowLeft className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
                Pick Your Pitch
              </Link>
            )}
          </div>

          {scored && !upNext ? (
            <p className="mt-3 text-center text-sm font-extrabold text-warmgray">
              You cleared the hardest pitch. Replay for a bigger score.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
