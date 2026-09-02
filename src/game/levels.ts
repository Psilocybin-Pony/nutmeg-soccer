import type { Bumper, Difficulty, Vec } from "./types";

export interface LevelConfig {
  id: Difficulty;
  label: string;
  blurb: string;
  bumperCount: number;
  /** Score multiplier applied to everything earned on this pitch. */
  multiplier: number;
  accent: string;
  accentDark: string;
  bumpers: Bumper[];
  /** Where the automated keeper patrols this pitch. */
  goalie: Vec;
}

function toBumpers(points: [number, number][]): Bumper[] {
  return points.map(([x, y], index) => ({ id: `b${index}`, x, y }));
}

export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    blurb: "4 bumpers · wide open lanes",
    bumperCount: 4,
    multiplier: 1,
    accent: "#3F9E4D",
    accentDark: "#2E7A3A",
    bumpers: toBumpers([
      [200, 300],
      [650, 300],
      [315, 486],
      [535, 486],
    ]),
    goalie: { x: 425, y: 250 },
  },
  medium: {
    id: "medium",
    label: "Medium",
    blurb: "9 bumpers · midfield trouble",
    bumperCount: 9,
    multiplier: 1.6,
    accent: "#FF7A1A",
    accentDark: "#CC5F10",
    bumpers: toBumpers([
      [153, 250],
      [425, 226],
      [697, 250],
      [270, 372],
      [580, 372],
      [425, 452],
      [153, 528],
      [697, 528],
      [425, 606],
    ]),
    goalie: { x: 425, y: 316 },
  },
  hard: {
    id: "hard",
    label: "Hard",
    blurb: "16 bumpers · pinball chaos",
    bumperCount: 16,
    multiplier: 2.4,
    accent: "#E23B3B",
    accentDark: "#AF2727",
    bumpers: toBumpers([
      [136, 226],
      [289, 226],
      [561, 226],
      [714, 226],
      [212, 330],
      [366, 330],
      [484, 330],
      [638, 330],
      [136, 442],
      [289, 442],
      [561, 442],
      [714, 442],
      [212, 552],
      [366, 552],
      [484, 552],
      [638, 552],
    ]),
    goalie: { x: 425, y: 250 },
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

export function isDifficulty(value: string | undefined): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

export function nextDifficulty(current: Difficulty): Difficulty | null {
  const index = DIFFICULTY_ORDER.indexOf(current);
  return index >= 0 && index < DIFFICULTY_ORDER.length - 1 ? DIFFICULTY_ORDER[index + 1] : null;
}
