import { ArrowLeft, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { CharacterPicker } from "@/components/game/CharacterPicker";
import { LaunchConsole } from "@/components/game/LaunchConsole";
import { PitchField } from "@/components/game/PitchField";
import { ResultOverlay } from "@/components/game/ResultOverlay";
import { RoundIntroPopup } from "@/components/game/RoundIntroPopup";
import { TopBar } from "@/components/game/TopBar";
import { isDifficulty, LEVELS } from "@/game/levels";
import { useNutmegGame } from "@/hooks/useNutmegGame";

const Play = () => {
  const { difficulty } = useParams<{ difficulty: string }>();
  const valid = isDifficulty(difficulty);
  const level = LEVELS[valid ? difficulty : "easy"];
  const game = useNutmegGame(level.id);
  const [overlayDismissed, setOverlayDismissed] = useState<boolean>(false);
  const [introOpen, setIntroOpen] = useState<boolean>(true);

  const finished = game.phase === "scored" || game.phase === "failed";

  useEffect(() => {
    if (!finished) setOverlayDismissed(false);
  }, [finished]);

  const handleReplay = useCallback(() => {
    setOverlayDismissed(false);
    setIntroOpen(true);
    game.restart();
  }, [game]);

  const closeIntro = useCallback(() => setIntroOpen(false), []);

  if (!valid) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar bestScore={game.bestScore}>
        <span
          className="hidden items-center gap-2 rounded-full border-[3px] border-ink px-3 py-1.5 font-display text-lg uppercase text-white shadow-comic-sm sm:flex"
          style={{ backgroundColor: level.accent }}
        >
          <Target className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          {level.label}
        </span>
        <span className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-3 py-1.5 shadow-comic-sm">
          <span className="text-sm font-extrabold text-ink sm:text-base">
            <span className="hidden sm:inline">Score: </span>
            {game.score.toLocaleString()}
          </span>
        </span>
      </TopBar>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-2 px-2 pb-3 pt-2 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-3">
        <nav className="flex items-center gap-2 text-sm font-extrabold" aria-label="Breadcrumb">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-grass-dark hover:underline"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            Pick Your Pitch
          </Link>
          <span className="text-warmgray/60">/</span>
          <span className="font-display text-xl text-ink">The Pitch</span>
          <span className="ml-auto text-warmgray">
            {game.phase === "flying"
              ? "Ball in play…"
              : game.shotsLeft > 0
                ? `${game.shotsLeft} ${game.shotsLeft === 1 ? "shot" : "shots"} left`
                : "No shots left"}
          </span>
        </nav>

        <div className="relative">
          <PitchField game={game} />
        </div>

        {game.lastShot?.outcome === "miss" && game.phase === "aiming" ? (
          <p className="rounded-2xl border-[3px] border-ink bg-white px-4 py-2 text-center text-sm font-extrabold text-warmgray shadow-comic-sm">
            {`No luck — ${game.lastShot.hits} bumper ${game.lastShot.hits === 1 ? "hit" : "hits"} banked ${game.lastShot.points.toLocaleString()} pts. Re-position your striker and go again.`}
          </p>
        ) : null}

        <LaunchConsole game={game} onResetPitch={handleReplay} />
      </main>

      {game.phase === "drafting" ? <CharacterPicker onPick={game.chooseCharacter} /> : null}

      {introOpen ? (
        <RoundIntroPopup levelLabel={level.label} onDismiss={closeIntro} />
      ) : null}

      {finished && !overlayDismissed ? (
        <ResultOverlay
          level={level}
          outcome={game.phase === "scored" ? "scored" : "failed"}
          shot={game.lastShot}
          score={game.score}
          shotsUsed={game.shotsUsed}
          onReplay={handleReplay}
          onDismiss={() => setOverlayDismissed(true)}
        />
      ) : null}
    </div>
  );
};

export default Play;
