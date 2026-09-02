import { ChevronsDown, Move, Sparkles, X } from "lucide-react";
import { useEffect } from "react";

interface RoundIntroPopupProps {
  levelLabel: string;
  onDismiss: () => void;
}

const INSTRUCTIONS = [
  {
    icon: Sparkles,
    badge: "bg-lemon text-ink",
    text: "Pick ONE striker — her superpower fires whenever the ball hits her.",
  },
  {
    icon: Move,
    badge: "bg-tangerine text-white",
    text: "Drag her anywhere on the pitch to choose her deflection spot.",
  },
  {
    icon: ChevronsDown,
    badge: "bg-grass text-white",
    text: "Pull the spring plunger on the right and release to launch.",
  },
];

/** Shown at the start of each round with the core controls. */
export function RoundIntroPopup({ levelLabel, onDismiss }: RoundIntroPopupProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="How to play this round"
    >
      <div className="comic-panel relative w-full max-w-[520px] animate-pop-in p-5 sm:p-7">
        <button
          type="button"
          onClick={onDismiss}
          className="comic-btn absolute right-3 top-3 z-10 h-10 w-10 bg-white text-ink"
          aria-label="Close the round briefing"
        >
          <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>

        <p className="font-display text-sm uppercase tracking-wide text-tangerine">{levelLabel}</p>
        <h2 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">Round Briefing</h2>

        <ul className="mt-5 flex flex-col gap-3">
          {INSTRUCTIONS.map((instruction) => (
            <li
              key={instruction.text}
              className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream p-3 shadow-comic-sm"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-ink ${instruction.badge}`}
              >
                <instruction.icon className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="text-sm font-extrabold leading-snug text-ink sm:text-base">
                {instruction.text}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onDismiss}
          className="comic-btn mt-6 h-14 w-full bg-grass font-display text-2xl text-white"
        >
          Let's Go
        </button>
      </div>
    </div>
  );
}
