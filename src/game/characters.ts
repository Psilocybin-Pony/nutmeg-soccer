import type { CharacterId } from "./types";

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  /** Shirt number shown on the striker base. */
  number: number;
  image: string;
  /** Base disc tint, drawn behind the figurine. */
  tint: string;
  trait: string;
  /** Superpower name + description, shown in the striker picker. */
  superpower: { name: string; description: string };
}

/** The five strikers, in the order they take the pitch. */
export const CHARACTERS: CharacterMeta[] = [
  {
    id: "nutmeg",
    name: "Nutmeg",
    number: 41,
    image: "/characters/nutmeg.png",
    tint: "#E23B3B",
    trait: "Never loses a duel",
    superpower: {
      name: "Super Kick",
      description: "Hammers the ball with a thunderous, long-carrying strike that caroms off every bumper it meets. Only the keeper can stop it.",
    },
  },
  {
    id: "libbie",
    name: "Libbie",
    number: 8,
    image: "/characters/libbie.png",
    tint: "#3BA7E0",
    trait: "Reads every rebound",
    superpower: {
      name: "Piercing Shot",
      description: "A rocket that flies straight through the keeper. Bumpers along the way can still block it.",
    },
  },
  {
    id: "valerina",
    name: "Valerina",
    number: 0,
    image: "/characters/valerina.png",
    tint: "#FF7A1A",
    trait: "Ice cold under pressure",
    superpower: {
      name: "Shot Stopper",
      description: "Not pickable — she's the automated keeper who dives to block your shot.",
    },
  },
  {
    id: "fresca",
    name: "Fresca",
    number: 19,
    image: "/characters/fresca.png",
    tint: "#FFC93C",
    trait: "First to every loose ball",
    superpower: {
      name: "Chaotic Rush",
      description: "Blur-rushes across the pitch and takes a shot at the goal from a surprise spot.",
    },
  },
  {
    id: "bolivia",
    name: "Bolivia",
    number: 7,
    image: "/characters/bolivia.png",
    tint: "#2E4A7D",
    trait: "Turns defence into attack",
    superpower: {
      name: "Tornado",
      description: "Unleashes a giant whirlwind that obliterates every bumper in a wide radius, then sends the shot toward the goal.",
    },
  },
];

export const CHARACTER_BY_ID: Record<CharacterId, CharacterMeta> = CHARACTERS.reduce(
  (acc, character) => {
    acc[character.id] = character;
    return acc;
  },
  {} as Record<CharacterId, CharacterMeta>,
);
