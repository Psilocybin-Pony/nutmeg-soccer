export type Difficulty = "easy" | "medium" | "hard";

export type CharacterId = "nutmeg" | "libbie" | "valerina" | "fresca" | "bolivia";

export interface Vec {
  x: number;
  y: number;
}

export interface Ball extends Vec {
  vx: number;
  vy: number;
  spin: number;
  /** Nutmeg's super kick: a charged ball that keeps its speed and burns out late. */
  superKick: boolean;
  /** Libbie's super kick: the ball sails through the keeper. */
  ghostGoalie: boolean;
  /** Fresca carries the ball while rushing across the pitch. */
  held: boolean;
}

export interface Bumper extends Vec {
  id: string;
}

/** A character on the pitch. Only the keeper uses `angle` (her save bar). */
export interface Striker extends Vec {
  id: CharacterId;
  angle: number;
}

export type ShotOutcome = "goal" | "miss";

export interface ShotSummary {
  outcome: ShotOutcome;
  hits: number;
  points: number;
  /** Filled for goals: how the ball went in. */
  placement?: "Top corner" | "Side netting" | "Straight down the middle";
  /** Filled for misses: the ball stalled without scoring. */
  cause?: "stuck";
}

export type GamePhase = "drafting" | "aiming" | "flying" | "scored" | "failed";
