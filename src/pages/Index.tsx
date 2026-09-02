import { Lightbulb, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { MiniPitch } from "@/components/game/MiniPitch";
import { TopBar } from "@/components/game/TopBar";
import { BEST_SCORE_KEY } from "@/game/constants";
import { DIFFICULTY_ORDER, LEVELS } from "@/game/levels";

function readBestScore(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsed = stored ? Number.parseInt(stored, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

const Index = () => {
  const bestScore = readBestScore();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar bestScore={bestScore} />

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-3 pb-8 pt-6 sm:px-5">
        <section className="relative flex flex-col items-center text-center">
          <h1 className="font-display text-[44px] leading-[0.95] text-lemon comic-stroke sm:text-[76px]">
            Pick your pitch
          </h1>
          <p className="mt-3 max-w-[520px] text-base font-extrabold text-warmgray sm:text-lg">
            Draft one striker with a superpower, place her, and fire the plunger at the top-corner goal.
          </p>

          <span
            className="pointer-events-none absolute right-2 top-0 hidden h-16 w-16 animate-ball-bob rounded-full border-[4px] border-ink bg-white lg:block"
            aria-hidden="true"
          >
            <span
              className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 bg-ink"
              style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}
            />
            <span className="absolute left-1.5 top-2 h-3 w-3 rounded-full bg-ink" />
            <span className="absolute bottom-2 right-2 h-3 w-3 rounded-full bg-ink" />
          </span>
        </section>

        <section className="mt-7 grid flex-1 grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFICULTY_ORDER.map((difficulty, index) => {
            const level = LEVELS[difficulty];
            return (
              <Link
                key={level.id}
                to={`/play/${level.id}`}
                className="comic-panel group flex animate-rise-in flex-col gap-3 p-3 transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 sm:p-4"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span
                  className="rounded-2xl border-[3px] border-ink py-2 text-center font-display text-3xl uppercase tracking-wide text-white comic-text-shadow sm:text-4xl"
                  style={{ backgroundColor: level.accent }}
                >
                  {level.label}
                </span>

                <span className="overflow-hidden rounded-2xl border-[3px] border-ink">
                  <MiniPitch level={level} />
                </span>

                <span className="text-center text-base font-extrabold text-warmgray">{level.blurb}</span>

                <span
                  className="comic-btn h-14 w-full text-white transition-transform group-hover:scale-[1.02]"
                  style={{ backgroundColor: level.accent }}
                >
                  <Play className="h-7 w-7 fill-white" strokeWidth={3} aria-hidden="true" />
                  <span className="sr-only">Play {level.label}</span>
                </span>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 flex items-center justify-center gap-3 rounded-[20px] border-[3px] border-ink bg-white/85 px-4 py-3 text-center shadow-comic-sm">
          <Lightbulb className="h-6 w-6 shrink-0 text-lemon" strokeWidth={3} aria-hidden="true" />
          <p className="text-sm font-extrabold text-warmgray sm:text-base">
            Every superpower fires when the ball hits your striker — Valerina is the automated keeper you have to beat
          </p>
        </section>
      </main>
    </div>
  );
};

export default Index;
