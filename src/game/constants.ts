import type { Bumper } from "./types";

/**
 * Fixed world dimensions the pitch is simulated in. Everything scales from here.
 * The narrow 850×700 world keeps the pitch tall and its contents readable on
 * phone-sized screens (everything renders ~18% larger than a 1000-wide world).
 */
export const WORLD_W = 850;
export const WORLD_H = 700;

export const BALL_R = 14;
export const STRIKER_R = 34;
/**
 * Strikers deflect with a straight bumper bar tangent to the front of their
 * body circle. Its half-length equals the body radius, so the bar spans the
 * full diameter of the collision zone.
 */
export const STRIKER_BUMPER_HALF = STRIKER_R;
/** Visual thickness of the bumper bar, in world units. */
export const STRIKER_BUMPER_THICK = 13;
export const BUMPER_R = 22;

/** Goal frame — mouth faces down the pitch, ball can travel behind it. */
export const GOAL_LEFT = 306;
export const GOAL_RIGHT = 544;
/** Centre of the goal mouth — the straight-shot target the keeper guards. */
export const GOAL_CENTER_X = (GOAL_LEFT + GOAL_RIGHT) / 2;
export const GOAL_BACK_Y = 74;
export const GOAL_MOUTH_Y = 142;
export const POST_R = 7;

/**
 * Pinball plunger launcher on the right edge of the pitch. The ball rests on
 * the plunger at LAUNCH_X/LAUNCH_Y; pulling it down charges the launch power.
 */
export const LAUNCH_X = WORLD_W - 42;
export const LAUNCH_Y = 560;
export const PLUNGER_MAX_PULL = 112;
export const MIN_PLUNGER_POWER = 15;

/** Bounds the chosen striker may be dragged inside (launcher lane reserved). */
export const PLACE_MIN_X = 60;
export const PLACE_MAX_X = 750;
export const PLACE_MIN_Y = 196;
export const PLACE_MAX_Y = 614;

/** Minimum centre distance between two placed strikers. */
export const STRIKER_MIN_GAP = 84;

/** Strikers may not camp on top of the ball's launch spot. */
export const LAUNCH_KEEPOUT = 92;

/**
 * The goalkeeper owns the direct-shot lane. She is allowed lateral movement of
 * 1/2 of her width (2 × STRIKER_R) from the launch→goal-centre line, which
 * keeps glancing contacts steep enough that they cannot carry straight through.
 */
export const GOALIE_LATERAL_ALLOWANCE = Math.round(0.5 * STRIKER_R * 2);
/**
 * Effective clamp. The ball is blocked whenever the keeper's centre sits
 * within STRIKER_R + BALL_R of its path, so we cap the wiggle at the widest
 * offset that still guarantees a block — always inside the 1/2-width promise.
 */
export const GOALIE_MAX_LATERAL = Math.min(GOALIE_LATERAL_ALLOWANCE, STRIKER_R + BALL_R - 4);

/** The automated goalkeeper patrolling the shooting lane. */
export const GOALIE_ID = "valerina" as const;
/** She starts each kick with her bumper facing the bottom of the screen. */
export const GOALIE_START_ANGLE = 180;
/** Her dive arc: the bumper only ever faces the lower half of the pitch. */
export const GOALIE_ANGLE_MIN = 90;
export const GOALIE_ANGLE_MAX = 270;
/** Diving speed cap, world units per second — keeps her beatable. */
export const GOALIE_SPEED = 260;
/** Turn-rate cap, degrees per second. */
export const GOALIE_ROTATE_SPEED = 210;

export const SHOTS_PER_LEVEL = 3;

/** Corner bumpers that scatter the plunger-launched ball into the field. */
export const CORNER_BUMPERS: Bumper[] = [
  { id: "corner-tl", x: 68, y: 64 },
  { id: "corner-tr", x: 782, y: 64 },
  { id: "corner-bl", x: 68, y: 620 },
];

/**
 * Bolivia's tornado obliterates bumpers within a huge radius around her —
 * five collision radii, covering most of her half of the pitch.
 */
export const BOLIVIA_TORNADO_RADIUS = STRIKER_R * 5;
/** Nutmeg's super kick: sails through every bumper, goalie can still save. */
export const NUTMEG_POWER_SPEED = 1470;
/** Libbie's super kick: sails through the goalie, bumpers still obstruct. */
export const LIBBIE_POWER_SPEED = 1220;
/** Bolivia's tornado shot: normal rules after the area is cleared. */
export const BOLIVIA_POWER_SPEED = 1020;
/** Fresca's surprise shot from wherever she lands. */
export const FRESCA_POWER_SPEED = 1000;
/** How long Fresca blurs around the pitch before landing. */
export const FRESCA_RUSH_TIME = 0.95;
export const FRESCA_RUSH_SPEED = 1500;
/** How long she poses at her landing spot, ball at her feet, before firing. */
export const FRESCA_LAND_PAUSE = 0.7;

export const MIN_LAUNCH_SPEED = 430;
export const MAX_LAUNCH_SPEED = 1180;

export const BEST_SCORE_KEY = "nutmeg.best-score";

export const PALETTE = {
  ink: "#1A1A1A",
  cream: "#FDF6E3",
  grass: "#58B368",
  grassLight: "#6BC27A",
  grassDark: "#3F8F4E",
  chalk: "rgba(255,255,255,0.82)",
  lemon: "#FFC93C",
  lemonDeep: "#E8A81C",
  tangerine: "#FF7A1A",
  red: "#E23B3B",
  redDark: "#B32B2B",
  white: "#FFFFFF",
} as const;
