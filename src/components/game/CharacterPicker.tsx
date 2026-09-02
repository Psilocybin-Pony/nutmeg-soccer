import { Sparkles } from "lucide-react";

import { CHARACTERS } from "@/game/characters";
import type { CharacterId } from "@/game/types";

interface CharacterPickerProps {
  onPick: (id: CharacterId) => void;
}

const PICKABLE = CHARACTERS.filter((character) => character.id !== "valerina");

/** Round start: the player drafts exactly one striker for this round. */
export function CharacterPicker({ onPick }: CharacterPickerProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your striker"
    >
      <div className="comic-panel w-full max-w-[560px] animate-pop-in p-4 sm:p-6">
        <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">Choose your striker</h2>
        <p className="mt-1 text-sm font-extrabold text-warmgray">
          One per round — her superpower fires whenever the ball hits her.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PICKABLE.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => onPick(character.id)}
              className="comic-btn flex flex-col items-start gap-1.5 bg-white p-3 text-left hover:bg-cream"
            >
              <span className="flex w-full items-center gap-2.5">
                <img
                  src={character.image}
                  alt=""
                  draggable={false}
                  className="h-12 w-12 shrink-0 object-contain"
                />
                <span>
                  <span className="block font-display text-xl leading-tight text-ink">{character.name}</span>
                  <span className="text-xs font-black text-warmgray">#{character.number}</span>
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-tangerine">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                {character.superpower.name}
              </span>
              <span className="text-xs font-bold leading-snug text-warmgray">
                {character.superpower.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
