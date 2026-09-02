import {
  BALL_R,
  BUMPER_R,
  GOAL_BACK_Y,
  GOAL_CENTER_X,
  GOAL_LEFT,
  GOAL_MOUTH_Y,
  GOAL_RIGHT,
  GOALIE_MAX_LATERAL,
  LAUNCH_KEEPOUT,
  LAUNCH_X,
  LAUNCH_Y,
  POST_R,
  STRIKER_BUMPER_HALF,
  STRIKER_R,
  WORLD_H,
  WORLD_W,
} from "./constants";
import type { Ball, Bumper, CharacterId, Striker } from "./types";

const WALL_RESTITUTION = 0.84;
const BUMPER_RESTITUTION = 1.02;
/** The keeper's save bar deflects with plain reflection — no arcade kick. */
const GOALIE_BAR_RESTITUTION = 1.04;
const BUMPER_KICK = 90;
const DAMPING_PER_SECOND = 0.62;
/** Nutmeg's super kick saps far less energy per second — sustained travel. */
const SUPER_DAMPING_PER_SECOND = 0.9;
/** The super kick burns out below this speed and reverts to normal physics. */
const SUPER_MIN_SPEED = 500;
const STOP_SPEED = 34;
const MAX_SPEED = 1500;

export type StepEvent =
  | { type: "bumper"; id: string; x: number; y: number }
  | { type: "goalieSave"; x: number; y: number }
  | { type: "power"; id: CharacterId; x: number; y: number }
  | { type: "wall"; x: number; y: number }
  | { type: "post"; x: number; y: number };

export interface StepOutcome {
  goal: boolean;
  /** X position where the ball crossed into the goal mouth. */
  goalX: number;
  stopped: boolean;
  events: StepEvent[];
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const GOAL_FRAME: Segment[] = [
  { x1: GOAL_LEFT, y1: GOAL_BACK_Y, x2: GOAL_LEFT, y2: GOAL_MOUTH_Y },
  { x1: GOAL_RIGHT, y1: GOAL_BACK_Y, x2: GOAL_RIGHT, y2: GOAL_MOUTH_Y },
  { x1: GOAL_LEFT, y1: GOAL_BACK_Y, x2: GOAL_RIGHT, y2: GOAL_BACK_Y },
];

/**
 * The top-right corner bumper is the first thing the launched ball meets, so
 * it scatters with a random deflection angle instead of a plain reflection —
 * keeping the opening shot unpredictable.
 */
const RANDOM_DEFLECT_BUMPER_ID = "corner-tr";
/**
 * Fan of candidate deflection angles, degrees in screen space: 90° points
 * straight down, 180° straight left. Everything in between throws the ball
 * into open field rather than back up the launch lane.
 */
const DEFLECT_ANGLE_MIN = 100;
const DEFLECT_ANGLE_MAX = 178;
const DEFLECT_ATTEMPTS = 14;
/** How far ahead a candidate deflection path is inspected, in world units. */
const PATH_LOOKAHEAD = 820;
const PATH_SAMPLES = 40;
/** Candidate paths must clear the goal frame by this much. */
const FRAME_CLEARANCE = POST_R + BALL_R + 4;

/**
 * True when the ray from (x, y) along unit direction (dx, dy) stays clear of
 * the goal frame (posts, sides, and back bar) and the keeper's current spot.
 * Sampled at fixed intervals along the ray — cheap and good enough here.
 */
function pathIsClean(x: number, y: number, dx: number, dy: number, goalie: Striker | null): boolean {
  const goalieClearance = STRIKER_R + BALL_R + 6;
  for (let i = 1; i <= PATH_SAMPLES; i += 1) {
    const distance = (PATH_LOOKAHEAD / PATH_SAMPLES) * i;
    const px = x + dx * distance;
    const py = y + dy * distance;
    for (const segment of GOAL_FRAME) {
      const point = closestPointOnSegment(px, py, segment);
      if (Math.hypot(px - point.x, py - point.y) < FRAME_CLEARANCE) return false;
    }
    if (goalie && Math.hypot(px - goalie.x, py - goalie.y) < goalieClearance) return false;
  }
  return true;
}

/**
 * Random deflection off the top-right corner bumper: keeps the impact speed
 * (plus the standard arcade kick) but throws the ball at a random angle into
 * the pitch. Candidate angles that would slam into the goal frame's sides or
 * straight at the keeper are rejected and re-rolled, so the scatter always
 * sends the ball somewhere fair and in play.
 */
function applyRandomDeflection(ball: Ball, speed: number, bumper: Bumper, goalie: Striker | null): void {
  const magnitude = speed + BUMPER_KICK;
  for (let attempt = 0; attempt < DEFLECT_ATTEMPTS; attempt += 1) {
    const degrees = DEFLECT_ANGLE_MIN + Math.random() * (DEFLECT_ANGLE_MAX - DEFLECT_ANGLE_MIN);
    const radians = (degrees * Math.PI) / 180;
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);
    if (pathIsClean(bumper.x, bumper.y, dx, dy, goalie)) {
      ball.vx = dx * magnitude;
      ball.vy = dy * magnitude;
      return;
    }
  }
  // Every sample was dirty (rare): keep the plain reflection and add the kick.
  const current = Math.hypot(ball.vx, ball.vy) || 1;
  ball.vx += (ball.vx / current) * BUMPER_KICK;
  ball.vy += (ball.vy / current) * BUMPER_KICK;
}

function clampSpeed(ball: Ball): void {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
}

function closestPointOnSegment(px: number, py: number, seg: Segment): { x: number; y: number } {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return { x: seg.x1, y: seg.y1 };
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + t * dx, y: seg.y1 + t * dy };
}

function resolveCircle(
  ball: Ball,
  cx: number,
  cy: number,
  radius: number,
  restitution: number,
): boolean {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const minDistance = radius + BALL_R;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= minDistance * minDistance) return false;

  const distance = Math.sqrt(distanceSq) || 0.0001;
  const nx = dx / distance;
  const ny = dy / distance;
  ball.x = cx + nx * (minDistance + 0.5);
  ball.y = cy + ny * (minDistance + 0.5);

  const normalVelocity = ball.vx * nx + ball.vy * ny;
  if (normalVelocity < 0) {
    ball.vx -= (1 + restitution) * normalVelocity * nx;
    ball.vy -= (1 + restitution) * normalVelocity * ny;
  }
  return true;
}

/** A straight segment in world coordinates. */
export interface BumperSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The keeper's save surface: a straight bar tangent to the front of her body
 * circle, spanning the full diameter of her collision zone.
 */
export function goalieBumperSegment(goalie: Striker): BumperSegment {
  const radians = ((goalie.angle - 90) * Math.PI) / 180;
  const centerX = goalie.x + Math.cos(radians) * STRIKER_R;
  const centerY = goalie.y + Math.sin(radians) * STRIKER_R;
  const halfX = -Math.sin(radians) * STRIKER_BUMPER_HALF;
  const halfY = Math.cos(radians) * STRIKER_BUMPER_HALF;
  return { x1: centerX - halfX, y1: centerY - halfY, x2: centerX + halfX, y2: centerY + halfY };
}

/** Flat-surface collision: reflect off the segment, with rounded ends. */
function resolveSegment(ball: Ball, segment: BumperSegment, restitution: number): boolean {
  const point = closestPointOnSegment(ball.x, ball.y, segment);
  const dx = ball.x - point.x;
  const dy = ball.y - point.y;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= BALL_R * BALL_R) return false;

  const distance = Math.sqrt(distanceSq) || 0.0001;
  const nx = dx / distance;
  const ny = dy / distance;
  ball.x = point.x + nx * (BALL_R + 0.5);
  ball.y = point.y + ny * (BALL_R + 0.5);

  const normalVelocity = ball.vx * nx + ball.vy * ny;
  if (normalVelocity < 0) {
    ball.vx -= (1 + restitution) * normalVelocity * nx;
    ball.vy -= (1 + restitution) * normalVelocity * ny;
  }
  return true;
}

/**
 * Advances the ball one fixed sub-step: integration, damping, and collisions
 * against walls, the goal frame, static bumpers, the keeper's save bar, and
 * the chosen striker (whose contact fires her superpower). Ghost flags let
 * superpowered balls phase through bumpers and/or the keeper.
 */
export function stepBall(
  ball: Ball,
  bumpers: Bumper[],
  goalie: Striker | null,
  striker: Striker | null,
  dt: number,
  contactCooldown: Map<string, number>,
  elapsed: number,
): StepOutcome {
  const outcome: StepOutcome = {
    goal: false,
    goalX: 0,
    stopped: false,
    events: [],
  };

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const damping = Math.pow(ball.superKick ? SUPER_DAMPING_PER_SECOND : DAMPING_PER_SECOND, dt);
  ball.vx *= damping;
  ball.vy *= damping;
  ball.spin += Math.hypot(ball.vx, ball.vy) * dt * 0.012;

  const canRegister = (id: string, gap = 0.12): boolean => {
    const last = contactCooldown.get(id) ?? -1;
    if (elapsed - last < gap) return false;
    contactCooldown.set(id, elapsed);
    return true;
  };

  // Goal: the ball crossed into the mouth between the posts.
  if (ball.y < GOAL_MOUTH_Y && ball.y > GOAL_BACK_Y && ball.x > GOAL_LEFT + POST_R && ball.x < GOAL_RIGHT - POST_R) {
    outcome.goal = true;
    outcome.goalX = ball.x;
    return outcome;
  }

  // Field boundary.
  if (ball.x < BALL_R) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx) * WALL_RESTITUTION;
    outcome.events.push({ type: "wall", x: ball.x, y: ball.y });
  } else if (ball.x > WORLD_W - BALL_R) {
    ball.x = WORLD_W - BALL_R;
    ball.vx = -Math.abs(ball.vx) * WALL_RESTITUTION;
    outcome.events.push({ type: "wall", x: ball.x, y: ball.y });
  }
  if (ball.y < BALL_R) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy) * WALL_RESTITUTION;
    outcome.events.push({ type: "wall", x: ball.x, y: ball.y });
  } else if (ball.y > WORLD_H - BALL_R) {
    ball.y = WORLD_H - BALL_R;
    ball.vy = -Math.abs(ball.vy) * WALL_RESTITUTION;
    outcome.events.push({ type: "wall", x: ball.x, y: ball.y });
  }

  // Goal frame (posts + back bar behave like rounded rails).
  GOAL_FRAME.forEach((segment, index) => {
    const point = closestPointOnSegment(ball.x, ball.y, segment);
    if (resolveCircle(ball, point.x, point.y, POST_R, 0.9)) {
      if (canRegister(`post-${index}`)) {
        outcome.events.push({ type: "post", x: point.x, y: point.y });
      }
    }
  });

  // Static + corner bumpers add a flat speed kick, arcade style. Nutmeg's
  // super kick caroms off them with retained speed rather than phasing
  // through. The top-right corner bumper deflects at a random angle instead
  // (goal frame and keeper excluded).
  for (const bumper of bumpers) {
    if (resolveCircle(ball, bumper.x, bumper.y, BUMPER_R, BUMPER_RESTITUTION)) {
      const speed = Math.hypot(ball.vx, ball.vy) || 1;
      if (bumper.id === RANDOM_DEFLECT_BUMPER_ID) {
        applyRandomDeflection(ball, speed, bumper, goalie);
      } else {
        ball.vx += (ball.vx / speed) * BUMPER_KICK;
        ball.vy += (ball.vy / speed) * BUMPER_KICK;
      }
      if (canRegister(`bumper-${bumper.id}`)) {
        outcome.events.push({ type: "bumper", id: bumper.id, x: bumper.x, y: bumper.y });
      }
    }
  }

  // The keeper's save bar. Libbie's super kick phases straight through her.
  if (goalie && !ball.ghostGoalie) {
    const segment = goalieBumperSegment(goalie);
    if (resolveSegment(ball, segment, GOALIE_BAR_RESTITUTION)) {
      // The keeper is the one thing that stops a super kick: her save drains
      // the charge, so the ball reverts to normal physics afterwards.
      ball.superKick = false;
      const point = closestPointOnSegment(ball.x, ball.y, segment);
      if (canRegister(`goalie-${goalie.id}`)) {
        outcome.events.push({ type: "goalieSave", x: point.x, y: point.y });
      }
    }
  }

  // The chosen striker: her whole body is a live trigger for her superpower.
  if (striker) {
    if (resolveCircle(ball, striker.x, striker.y, STRIKER_R, 1.0)) {
      if (canRegister(`power-${striker.id}`, 0.4)) {
        outcome.events.push({ type: "power", id: striker.id, x: ball.x, y: ball.y });
      }
    }
  }

  clampSpeed(ball);

  if (ball.superKick && Math.hypot(ball.vx, ball.vy) < SUPER_MIN_SPEED) {
    ball.superKick = false;
  }

  if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
    ball.vx = 0;
    ball.vy = 0;
    outcome.stopped = true;
  }

  return outcome;
}

/**
 * The goalkeeper owns the patrol lane in front of the goal, so she may only
 * shuffle sideways within GOALIE_MAX_LATERAL of the goal's centre line.
 * Vertical movement along the lane stays free.
 */
export function clampGoalieToShotLane(candidate: { x: number; y: number }): { x: number; y: number } {
  const min = GOAL_CENTER_X - GOALIE_MAX_LATERAL;
  const max = GOAL_CENTER_X + GOALIE_MAX_LATERAL;
  return { x: Math.min(max, Math.max(min, candidate.x)), y: candidate.y };
}

/** Keeps a dragged striker inside the legal placement zone and clear of others. */
export function isPlacementValid(
  candidate: { x: number; y: number },
  id: string,
  strikers: Striker[],
  bumpers: Bumper[],
  minGap: number,
): boolean {
  if (Math.hypot(candidate.x - LAUNCH_X, candidate.y - LAUNCH_Y) < LAUNCH_KEEPOUT) return false;
  for (const striker of strikers) {
    if (striker.id === id) continue;
    if (Math.hypot(striker.x - candidate.x, striker.y - candidate.y) < minGap) return false;
  }
  for (const bumper of bumpers) {
    if (Math.hypot(bumper.x - candidate.x, bumper.y - candidate.y) < STRIKER_R + BUMPER_R + 6) {
      return false;
    }
  }
  return true;
}
