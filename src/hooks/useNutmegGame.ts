import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

import {
  BEST_SCORE_KEY,
  BOLIVIA_POWER_SPEED,
  BOLIVIA_TORNADO_RADIUS,
  CORNER_BUMPERS,
  FRESCA_LAND_PAUSE,
  FRESCA_POWER_SPEED,
  FRESCA_RUSH_SPEED,
  FRESCA_RUSH_TIME,
  GOAL_CENTER_X,
  GOAL_LEFT,
  GOAL_MOUTH_Y,
  GOAL_RIGHT,
  GOALIE_ANGLE_MAX,
  GOALIE_ANGLE_MIN,
  GOALIE_ID,
  GOALIE_ROTATE_SPEED,
  GOALIE_SPEED,
  GOALIE_START_ANGLE,
  LAUNCH_X,
  LAUNCH_Y,
  LIBBIE_POWER_SPEED,
  MAX_LAUNCH_SPEED,
  MIN_LAUNCH_SPEED,
  MIN_PLUNGER_POWER,
  NUTMEG_POWER_SPEED,
  PLACE_MAX_X,
  PLACE_MAX_Y,
  PLACE_MIN_X,
  PLACE_MIN_Y,
  PLUNGER_MAX_PULL,
  SHOTS_PER_LEVEL,
  STRIKER_MIN_GAP,
} from "@/game/constants";
import {
  isMuted,
  playBlast,
  playBumperPing,
  playCrowdRoar,
  playKick,
  playStrikerHit,
  playWhistle,
  playWind,
  playWhoosh,
} from "@/game/audio";
import { CHARACTER_BY_ID } from "@/game/characters";
import { LEVELS } from "@/game/levels";
import { clampGoalieToShotLane, isPlacementValid, stepBall, type StepEvent } from "@/game/physics";
import { spawnSparkBurst, spawnSwirlSparks, type Flash, type Spark, type TornadoWhirl } from "@/game/render";
import type { Ball, Bumper, CharacterId, Difficulty, GamePhase, ShotSummary, Striker, Vec } from "@/game/types";

const MAX_SHOT_SECONDS = 14;
const FIXED_STEP = 1 / 240;
const TRAIL_LENGTH = 46;
const SPARKS_PER_HIT = 12;
const MAX_SPARKS = 260;

/** Fresca's chaotic rush, tracked outside React render. */
interface RushState {
  timer: number;
  lastJump: number;
  lastFlash: number;
  target: Vec | null;
  /** True once she has landed and is posing before her shot. */
  landed: boolean;
  landTimer: number;
  land: Vec | null;
  /** Unit vector of her current dash direction, for orienting motion blur. */
  dirX: number;
  dirY: number;
}

/** What the UI needs to render Fresca's rush: blur while dashing, pop on landing. */
export interface RushView {
  landed: boolean;
  dirX: number;
  dirY: number;
}

function makeBall(): Ball {
  return {
    x: LAUNCH_X,
    y: LAUNCH_Y,
    vx: 0,
    vy: 0,
    spin: 0,
    superKick: false,
    ghostGoalie: false,
    held: false,
  };
}

function readBestScore(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsed = stored ? Number.parseInt(stored, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface NutmegGame {
  phase: GamePhase;
  /** The striker the player drafted this round (null while drafting). */
  characterId: CharacterId | null;
  strikers: Striker[];
  /** Level bumpers + corner bumpers, minus any Bolivia has obliterated. */
  bumpers: Bumper[];
  /** Plunger pull, 0–100. */
  power: number;
  shotsUsed: number;
  shotsLeft: number;
  score: number;
  bestScore: number;
  lastShot: ShotSummary | null;
  liveHits: number;
  /** Fresca's rush state for rendering (null when she is not rushing). */
  rush: RushView | null;
  ballRef: MutableRefObject<Ball>;
  trailRef: MutableRefObject<Vec[]>;
  flashesRef: MutableRefObject<Flash[]>;
  /** Bumper-hit spark particles, updated outside React render. */
  sparksRef: MutableRefObject<Spark[]>;
  /** Bolivia's tornado vortex effects, updated outside React render. */
  whirlsRef: MutableRefObject<TornadoWhirl[]>;
  chooseCharacter: (id: CharacterId) => void;
  moveStriker: (id: CharacterId, position: Vec) => void;
  setPlunger: (value: number) => void;
  launch: () => void;
  restart: () => void;
  advance: (dt: number) => void;
}

/** Owns the whole match: drafting, placement, plunger launch, simulation, scoring. */
export function useNutmegGame(difficulty: Difficulty): NutmegGame {
  const level = LEVELS[difficulty];

  const [strikers, setStrikers] = useState<Striker[]>(() => [
    { id: GOALIE_ID, x: level.goalie.x, y: level.goalie.y, angle: GOALIE_START_ANGLE },
  ]);
  const [characterId, setCharacterId] = useState<CharacterId | null>(null);
  const [bumpers, setBumpers] = useState<Bumper[]>(() => [...level.bumpers, ...CORNER_BUMPERS]);
  const [phase, setPhase] = useState<GamePhase>("drafting");
  const [power, setPowerState] = useState<number>(0);
  const [shotsUsed, setShotsUsed] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => readBestScore());
  const [lastShot, setLastShot] = useState<ShotSummary | null>(null);
  const [liveHits, setLiveHits] = useState<number>(0);
  const [rush, setRush] = useState<RushView | null>(null);

  const ballRef = useRef<Ball>(makeBall());
  const trailRef = useRef<Vec[]>([]);
  const flashesRef = useRef<Flash[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const whirlsRef = useRef<TornadoWhirl[]>([]);
  const phaseRef = useRef<GamePhase>("drafting");
  const strikersRef = useRef<Striker[]>(strikers);
  const bumpersRef = useRef<Bumper[]>(bumpers);
  const characterRef = useRef<CharacterId | null>(null);
  const powerRef = useRef<number>(0);
  const hitsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const shotsUsedRef = useRef<number>(0);
  const rushRef = useRef<RushState | null>(null);

  useEffect(() => {
    strikersRef.current = strikers;
  }, [strikers]);

  useEffect(() => {
    bumpersRef.current = bumpers;
  }, [bumpers]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    shotsUsedRef.current = shotsUsed;
  }, [shotsUsed]);

  const makeGoalie = useCallback(
    (): Striker => ({ id: GOALIE_ID, x: level.goalie.x, y: level.goalie.y, angle: GOALIE_START_ANGLE }),
    [level.goalie.x, level.goalie.y],
  );

  // Restart cleanly when the pitch changes.
  useEffect(() => {
    const goalie = makeGoalie();
    strikersRef.current = [goalie];
    setStrikers([goalie]);
    characterRef.current = null;
    setCharacterId(null);
    const nextBumpers = [...level.bumpers, ...CORNER_BUMPERS];
    bumpersRef.current = nextBumpers;
    setBumpers(nextBumpers);
    phaseRef.current = "drafting";
    setPhase("drafting");
    shotsUsedRef.current = 0;
    setShotsUsed(0);
    setScore(0);
    setLastShot(null);
    setLiveHits(0);
    powerRef.current = 0;
    setPowerState(0);
    ballRef.current = makeBall();
    trailRef.current = [];
    flashesRef.current = [];
    sparksRef.current = [];
    whirlsRef.current = [];
    hitsRef.current = 0;
    elapsedRef.current = 0;
    cooldownRef.current.clear();
    rushRef.current = null;
    setRush(null);
  }, [level, makeGoalie]);

  const commitBest = useCallback((value: number) => {
    setBestScore((current) => {
      if (value <= current) return current;
      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(value));
      } catch {
        // Storage can be unavailable (private mode); the score still counts this session.
      }
      return value;
    });
  }, []);

  const setPlunger = useCallback((value: number) => {
    const next = clamp(Math.round(value), 0, 100);
    powerRef.current = next;
    setPowerState(next);
  }, []);

  /** Round start: the player drafts exactly one striker and she takes the pitch. */
  const chooseCharacter = useCallback(
    (id: CharacterId) => {
      if (phaseRef.current !== "drafting") return;
      const goalie = strikersRef.current.find((s) => s.id === GOALIE_ID) ?? makeGoalie();
      const spots: Vec[] = [
        { x: 425, y: 470 },
        { x: 320, y: 470 },
        { x: 530, y: 470 },
        { x: 425, y: 545 },
        { x: 300, y: 400 },
        { x: 550, y: 400 },
        { x: 425, y: 385 },
      ];
      const spot =
        spots.find((p) => isPlacementValid(p, id, [goalie], bumpersRef.current, STRIKER_MIN_GAP)) ??
        { x: 425, y: 470 };
      const next: Striker[] = [goalie, { id, x: spot.x, y: spot.y, angle: 0 }];
      strikersRef.current = next;
      setStrikers(next);
      characterRef.current = id;
      setCharacterId(id);
      phaseRef.current = "aiming";
      setPhase("aiming");
    },
    [makeGoalie],
  );

  const moveStriker = useCallback((id: CharacterId, position: Vec) => {
    if (phaseRef.current !== "aiming" || id === GOALIE_ID) return;
    setStrikers((current) => {
      const bounded = {
        x: clamp(position.x, PLACE_MIN_X, PLACE_MAX_X),
        y: clamp(position.y, PLACE_MIN_Y, PLACE_MAX_Y),
      };
      if (!isPlacementValid(bounded, id, current, bumpersRef.current, STRIKER_MIN_GAP)) return current;
      return current.map((striker) => (striker.id === id ? { ...striker, ...bounded } : striker));
    });
  }, []);

  /**
   * Superpower trigger: fires whenever the plungered ball connects with the
   * chosen striker's collision circle. Each character bends the rules her own
   * way before the ball is sent at the goal.
   */
  const handlePower = useCallback((id: CharacterId) => {
    const striker = strikersRef.current.find((s) => s.id === id);
    if (!striker) return;
    const ball = ballRef.current;
    const dx = GOAL_CENTER_X - ball.x;
    const dy = GOAL_MOUTH_Y - ball.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = dx / length;
    const ny = dy / length;
    flashesRef.current.push({ x: striker.x, y: striker.y, life: 0, color: CHARACTER_BY_ID[id].tint });

    switch (id) {
      case "nutmeg":
        // Super kick toward the goal; blast sound. The charged ball keeps its
        // speed far longer and caroms off bumpers — every rebound is a fresh
        // chance at goal. Only the keeper's save drains the charge.
        ball.vx = nx * NUTMEG_POWER_SPEED;
        ball.vy = ny * NUTMEG_POWER_SPEED;
        ball.superKick = true;
        ball.ghostGoalie = false;
        if (!isMuted()) playBlast();
        break;
      case "libbie":
        // Extra forceful kick; whistle; sails through the keeper only.
        ball.vx = nx * LIBBIE_POWER_SPEED;
        ball.vy = ny * LIBBIE_POWER_SPEED;
        ball.ghostGoalie = true;
        if (!isMuted()) playWhistle();
        break;
      case "bolivia": {
        // Tornado: wipe every bumper in a huge radius around her, then
        // auto-direct toward goal — with a whirling vortex spectacle.
        const inRange = bumpersRef.current.filter(
          (bumper) => Math.hypot(bumper.x - striker.x, bumper.y - striker.y) <= BOLIVIA_TORNADO_RADIUS,
        );
        const cleared = bumpersRef.current.filter(
          (bumper) => Math.hypot(bumper.x - striker.x, bumper.y - striker.y) > BOLIVIA_TORNADO_RADIUS,
        );
        bumpersRef.current = cleared;
        setBumpers(cleared);
        ball.vx = nx * BOLIVIA_POWER_SPEED;
        ball.vy = ny * BOLIVIA_POWER_SPEED;
        ball.ghostGoalie = false;
        // The whirl: one big vortex on her plus swirl sparks, then a mini
        // vortex and a debris burst wherever each obliterated bumper stood.
        whirlsRef.current.push(
          { x: striker.x, y: striker.y, life: 0, scale: 1, seed: Math.random() * Math.PI * 2 },
          { x: striker.x, y: striker.y, life: 0, scale: 0.55, seed: Math.random() * Math.PI * 2 },
        );
        sparksRef.current.push(...spawnSwirlSparks(striker.x, striker.y, 26));
        for (const bumper of inRange) {
          sparksRef.current.push(...spawnSparkBurst(bumper.x, bumper.y, 10));
          whirlsRef.current.push({ x: bumper.x, y: bumper.y, life: 0, scale: 0.34, seed: Math.random() * Math.PI * 2 });
        }
        flashesRef.current.push({ x: striker.x, y: striker.y, life: 0, color: "#FFFFFF" });
        if (!isMuted()) playWind();
        break;
      }
      case "fresca":
        // Chaotic blur rush: she carries the ball, then shoots from a random spot.
        ball.held = true;
        ball.vx = 0;
        ball.vy = 0;
        trailRef.current = [];
        rushRef.current = {
          timer: 0,
          lastJump: -1,
          lastFlash: 0,
          target: null,
          landed: false,
          landTimer: 0,
          land: null,
          dirX: 0,
          dirY: -1,
        };
        setRush({ landed: false, dirX: 0, dirY: -1 });
        if (!isMuted()) playWhoosh();
        break;
      default:
        break;
    }
  }, []);

  /**
   * Automated keeper: tracks the ball's projected path inside her lane and
   * turns her save bar toward the incoming ball, both capped at a fair speed.
   */
  const updateGoalie = useCallback((dt: number) => {
    const ball = ballRef.current;
    const current = strikersRef.current;
    const index = current.findIndex((striker) => striker.id === GOALIE_ID);
    if (index < 0) return;
    const goalie = current[index];

    // Dive toward where the ball will cross her line; otherwise shadow it.
    let targetX = ball.x;
    if (ball.vy < -40) {
      const timeToLine = (goalie.y - ball.y) / ball.vy;
      if (timeToLine > 0 && timeToLine < 4) {
        targetX = ball.x + ball.vx * timeToLine;
      }
    }
    const laneX = clampGoalieToShotLane({ x: targetX, y: goalie.y }).x;
    const dive = GOALIE_SPEED * dt;
    const dx = laneX - goalie.x;
    const nextX = Math.abs(dx) <= dive ? laneX : goalie.x + Math.sign(dx) * dive;

    // Keep the save bar turned toward the incoming ball, inside her arc.
    const desired = clamp(
      (Math.atan2(ball.x - nextX, -(ball.y - goalie.y)) * 180) / Math.PI,
      GOALIE_ANGLE_MIN,
      GOALIE_ANGLE_MAX,
    );
    let diff = desired - goalie.angle;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const maxTurn = GOALIE_ROTATE_SPEED * dt;
    const nextAngle = goalie.angle + (Math.abs(diff) <= maxTurn ? diff : Math.sign(diff) * maxTurn);

    if (nextX === goalie.x && nextAngle === goalie.angle) return;
    const updated = current.map((striker, i) =>
      i === index ? { ...striker, x: nextX, angle: ((nextAngle % 360) + 360) % 360 } : striker,
    );
    strikersRef.current = updated;
    setStrikers(updated);
  }, []);

  const finishGoal = useCallback(
    (goalX: number) => {
      if (!isMuted()) playCrowdRoar();
      const shots = shotsUsedRef.current + 1;
      const shotsRemaining = SHOTS_PER_LEVEL - shots;
      const cornerDistance = Math.min(Math.abs(goalX - GOAL_LEFT), Math.abs(goalX - GOAL_RIGHT));
      const placement: ShotSummary["placement"] =
        cornerDistance < 52 ? "Top corner" : cornerDistance < 94 ? "Side netting" : "Straight down the middle";
      const cornerBonus = placement === "Top corner" ? 450 : placement === "Side netting" ? 200 : 0;
      const hits = Math.min(hitsRef.current, 12);
      const points = Math.round(
        (500 + hits * 120 + cornerBonus + shotsRemaining * 250) * level.multiplier,
      );

      setShotsUsed(shots);
      setLastShot({ outcome: "goal", hits, points, placement });
      setScore((current) => {
        const total = current + points;
        commitBest(total);
        return total;
      });
      setPhase("scored");
    },
    [commitBest, level.multiplier],
  );

  const finishMiss = useCallback(
    (cause: "stuck" = "stuck") => {
      const shots = shotsUsedRef.current + 1;
      const hits = hitsRef.current;
      const points = Math.round(hits * 40 * level.multiplier);
      setShotsUsed(shots);
      setLastShot({ outcome: "miss", hits, points, cause });
      setScore((current) => {
        const total = current + points;
        commitBest(total);
        return total;
      });
      ballRef.current = makeBall();
      trailRef.current = [];
      rushRef.current = null;
      setRush(null);
      setPhase(shots >= SHOTS_PER_LEVEL ? "failed" : "aiming");
    },
    [commitBest, level.multiplier],
  );

  const registerEvents = useCallback(
    (events: StepEvent[]) => {
      let scoredHits = 0;
      for (const event of events) {
        if (event.type === "bumper") {
          scoredHits += 1;
          playBumperPing();
          flashesRef.current.push({ x: event.x, y: event.y, life: 0, color: "#FFF3C4" });
          sparksRef.current.push(...spawnSparkBurst(event.x, event.y, SPARKS_PER_HIT));
          if (sparksRef.current.length > MAX_SPARKS) {
            sparksRef.current.splice(0, sparksRef.current.length - MAX_SPARKS);
          }
        } else if (event.type === "goalieSave") {
          scoredHits += 1;
          playStrikerHit();
          flashesRef.current.push({ x: event.x, y: event.y, life: 0, color: "#FF7A1A" });
        } else if (event.type === "post") {
          flashesRef.current.push({ x: event.x, y: event.y, life: 0, color: "#FFFFFF" });
        } else if (event.type === "power") {
          handlePower(event.id);
        }
      }
      if (scoredHits > 0) {
        hitsRef.current += scoredHits;
        setLiveHits(hitsRef.current);
      }
    },
    [handlePower],
  );

  const advance = useCallback(
    (dt: number) => {
      // Flash rings fade and sparks fly, whatever the phase.
      if (flashesRef.current.length > 0) {
        flashesRef.current = flashesRef.current
          .map((flash) => ({ ...flash, life: flash.life + dt * 2.4 }))
          .filter((flash) => flash.life < 1);
      }
      if (sparksRef.current.length > 0) {
        sparksRef.current = sparksRef.current
          .map((spark) => ({
            ...spark,
            life: spark.life + dt * 2.2,
            x: spark.x + spark.vx * dt,
            y: spark.y + spark.vy * dt,
            vx: spark.vx * (1 - dt * 1.8),
            vy: spark.vy * (1 - dt * 0.6) + 420 * dt,
          }))
          .filter((spark) => spark.life < 1);
      }
      if (whirlsRef.current.length > 0) {
        whirlsRef.current = whirlsRef.current
          .map((whirl) => ({ ...whirl, life: whirl.life + dt * 1.5 }))
          .filter((whirl) => whirl.life < 1);
      }

      if (phaseRef.current !== "flying") {
        // While aiming, the ball rides on the plunger handle.
        if (phaseRef.current === "aiming") {
          const ball = ballRef.current;
          ball.x = LAUNCH_X;
          ball.y = LAUNCH_Y + (powerRef.current / 100) * PLUNGER_MAX_PULL;
          ball.vx = 0;
          ball.vy = 0;
          ball.held = false;
          ball.superKick = false;
          ball.ghostGoalie = false;
        }
        return;
      }

      const clamped = Math.min(dt, 0.05);
      updateGoalie(clamped);

      const ball = ballRef.current;

      // Fresca's rush: she blurs across the pitch carrying the ball, then
      // lands at a random spot and takes her shot toward the goal.
      if (ball.held) {
        const rush = rushRef.current;
        const id = characterRef.current;
        const index = strikersRef.current.findIndex((striker) => striker.id === id);
        if (!rush || index < 0 || !id) {
          ball.held = false;
          rushRef.current = null;
          setRush(null);
          return;
        }
        rush.timer += clamped;
        const fresca = strikersRef.current[index];

        if (!rush.target || rush.timer - rush.lastJump > 0.13) {
          rush.target = {
            x: PLACE_MIN_X + 40 + Math.random() * (PLACE_MAX_X - PLACE_MIN_X - 80),
            y: PLACE_MIN_Y + 30 + Math.random() * (PLACE_MAX_Y - PLACE_MIN_Y - 60),
          };
          rush.lastJump = rush.timer;
        }
        const dx = rush.target.x - fresca.x;
        const dy = rush.target.y - fresca.y;
        const dist = Math.hypot(dx, dy) || 1;
        const stepLen = Math.min(FRESCA_RUSH_SPEED * clamped, dist);
        const nextPos = { x: fresca.x + (dx / dist) * stepLen, y: fresca.y + (dy / dist) * stepLen };
        const dirX = dx / dist;
        const dirY = dy / dist;
        rush.dirX = dirX;
        rush.dirY = dirY;

        if (rush.timer - rush.lastFlash > 0.05) {
          rush.lastFlash = rush.timer;
          flashesRef.current.push({ x: nextPos.x, y: nextPos.y, life: 0, color: "#FFFFFF" });
        }

        const updated = strikersRef.current.map((striker, i) =>
          i === index ? { ...striker, ...nextPos } : striker,
        );
        strikersRef.current = updated;
        setStrikers(updated);
        setRush({ landed: false, dirX, dirY });

        if (rush.timer >= FRESCA_RUSH_TIME) {
          const spanX = PLACE_MAX_X - PLACE_MIN_X - 80;
          const spanY = PLACE_MAX_Y - PLACE_MIN_Y - 60;
          let land = { ...nextPos };
          for (let i = 0; i < 60; i += 1) {
            const candidate = {
              x: PLACE_MIN_X + 40 + Math.random() * spanX,
              y: PLACE_MIN_Y + 30 + Math.random() * spanY,
            };
            if (isPlacementValid(candidate, id, updated, bumpersRef.current, STRIKER_MIN_GAP)) {
              land = candidate;
              break;
            }
          }
          const landed = updated.map((striker, i) => (i === index ? { ...striker, ...land } : striker));
          strikersRef.current = landed;
          setStrikers(landed);
          // She poses at the landing spot with the ball at her feet for a
          // beat (FRESCA_LAND_PAUSE) before the shot is fired below.
          ball.held = false;
          ball.superKick = false;
          ball.ghostGoalie = false;
          ball.vx = 0;
          ball.vy = 0;
          ball.x = land.x;
          ball.y = land.y + 4;
          rush.landed = true;
          rush.landTimer = 0;
          rush.land = land;
          setRush({ landed: true, dirX: rush.dirX, dirY: rush.dirY });
          flashesRef.current.push({ x: land.x, y: land.y, life: 0, color: CHARACTER_BY_ID.fresca.tint });
        }
        return;
      }

      // Fresca's landing beat: she holds her pose, ball at her feet, then
      // fires at the goal once the pause is up.
      const activeRush = rushRef.current;
      if (activeRush?.landed && activeRush.land) {
        ball.x = activeRush.land.x;
        ball.y = activeRush.land.y + 4;
        ball.vx = 0;
        ball.vy = 0;
        activeRush.landTimer += clamped;
        if (activeRush.landTimer >= FRESCA_LAND_PAUSE) {
          const goalDx = GOAL_CENTER_X - activeRush.land.x;
          const goalDy = GOAL_MOUTH_Y - activeRush.land.y;
          const goalLen = Math.hypot(goalDx, goalDy) || 1;
          ball.vx = (goalDx / goalLen) * FRESCA_POWER_SPEED;
          ball.vy = (goalDy / goalLen) * FRESCA_POWER_SPEED;
          rushRef.current = null;
          setRush(null);
          if (!isMuted()) playKick();
        }
        return;
      }

      let remaining = clamped;
      const goalie = strikersRef.current.find((striker) => striker.id === GOALIE_ID) ?? null;
      const striker = strikersRef.current.find((item) => item.id !== GOALIE_ID) ?? null;

      while (remaining > 0) {
        const step = Math.min(FIXED_STEP, remaining);
        remaining -= step;
        elapsedRef.current += step;

        const outcome = stepBall(
          ball,
          bumpersRef.current,
          goalie,
          striker,
          step,
          cooldownRef.current,
          elapsedRef.current,
        );
        registerEvents(outcome.events);

        // A superpower captured the ball (Fresca's rush): stop simulating this
        // frame. Without this, the next sub-step sees zero velocity, flags the
        // ball as stuck, and finishMiss cancels the rush mid-capture.
        if (ballRef.current.held) break;

        if (outcome.goal) {
          phaseRef.current = "scored";
          finishGoal(outcome.goalX);
          return;
        }
        if (outcome.stopped || elapsedRef.current > MAX_SHOT_SECONDS) {
          phaseRef.current = "aiming";
          finishMiss("stuck");
          return;
        }
      }

      trailRef.current.push({ x: ball.x, y: ball.y });
      if (trailRef.current.length > TRAIL_LENGTH) trailRef.current.shift();
    },
    [finishGoal, finishMiss, registerEvents, updateGoalie],
  );

  const launch = useCallback(() => {
    if (phaseRef.current !== "aiming") return;
    const pull = Math.max(powerRef.current, MIN_PLUNGER_POWER);
    const speed = MIN_LAUNCH_SPEED + (pull / 100) * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
    ballRef.current = {
      x: LAUNCH_X,
      y: LAUNCH_Y,
      vx: 0,
      vy: -speed,
      spin: 0,
      superKick: false,
      ghostGoalie: false,
      held: false,
    };
    trailRef.current = [];
    flashesRef.current = [];
    sparksRef.current = [];
    whirlsRef.current = [];
    cooldownRef.current.clear();
    hitsRef.current = 0;
    elapsedRef.current = 0;
    rushRef.current = null;
    setRush(null);
    setLiveHits(0);
    setLastShot(null);
    setPlunger(0);
    phaseRef.current = "flying";
    setPhase("flying");
    if (!isMuted()) playKick();
  }, [setPlunger]);

  const restart = useCallback(() => {
    const goalie = makeGoalie();
    strikersRef.current = [goalie];
    setStrikers([goalie]);
    characterRef.current = null;
    setCharacterId(null);
    const nextBumpers = [...level.bumpers, ...CORNER_BUMPERS];
    bumpersRef.current = nextBumpers;
    setBumpers(nextBumpers);
    shotsUsedRef.current = 0;
    setShotsUsed(0);
    setScore(0);
    setLastShot(null);
    setLiveHits(0);
    setPlunger(0);
    ballRef.current = makeBall();
    trailRef.current = [];
    flashesRef.current = [];
    sparksRef.current = [];
    whirlsRef.current = [];
    hitsRef.current = 0;
    elapsedRef.current = 0;
    cooldownRef.current.clear();
    rushRef.current = null;
    setRush(null);
    phaseRef.current = "drafting";
    setPhase("drafting");
  }, [level.bumpers, makeGoalie, setPlunger]);

  return useMemo<NutmegGame>(
    () => ({
      phase,
      characterId,
      strikers,
      bumpers,
      power,
      shotsUsed,
      shotsLeft: Math.max(0, SHOTS_PER_LEVEL - shotsUsed),
      score,
      bestScore,
      lastShot,
      liveHits,
      rush,
      ballRef,
      trailRef,
      flashesRef,
      sparksRef,
      whirlsRef,
      chooseCharacter,
      moveStriker,
      setPlunger,
      launch,
      restart,
      advance,
    }),
    [
      advance,
      bestScore,
      bumpers,
      characterId,
      chooseCharacter,
      lastShot,
      launch,
      liveHits,
      moveStriker,
      rush,
      phase,
      power,
      restart,
      score,
      setPlunger,
      shotsUsed,
      strikers,
    ],
  );
}
