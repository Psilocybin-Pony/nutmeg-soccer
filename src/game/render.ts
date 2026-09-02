import {
  BALL_R,
  BOLIVIA_TORNADO_RADIUS,
  BUMPER_R,
  GOAL_BACK_Y,
  GOAL_CENTER_X,
  GOAL_LEFT,
  GOAL_MOUTH_Y,
  GOAL_RIGHT,
  LAUNCH_X,
  LAUNCH_Y,
  GOALIE_MAX_LATERAL,
  PALETTE,
  PLUNGER_MAX_PULL,
  POST_R,
  WORLD_H,
  WORLD_W,
} from "./constants";
import type { Ball, Bumper, Vec } from "./types";

export interface Flash extends Vec {
  /** 0 → just happened, 1 → finished. */
  life: number;
  color: string;
}

/** A single bumper-hit spark particle, drawn as a fading streak. */
export interface Spark extends Vec {
  vx: number;
  vy: number;
  /** 0 → just spawned, 1 → burned out. */
  life: number;
  color: string;
  size: number;
}

const SPARK_COLORS = ["#FFE38A", "#FFC93C", "#FF7A1A", "#FFFFFF"];

/** Spawns a radial burst of sparks at an impact point. */
export function spawnSparkBurst(x: number, y: number, count: number, color?: string): Spark[] {
  const colors = color ? [color] : SPARK_COLORS;
  const sparks: Spark[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 110 + Math.random() * 250;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 70,
      life: Math.random() * 0.12,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 2.4,
    });
  }
  return sparks;
}

/**
 * A rotating spiral vortex drawn where Bolivia's tornado rips through the
 * pitch. Multiple whirls can run at once (one big one plus mini-whirls on
 * each obliterated bumper).
 */
export interface TornadoWhirl {
  x: number;
  y: number;
  /** 0 → just spawned, 1 → finished. */
  life: number;
  /** Size multiplier relative to the tornado's demolition radius. */
  scale: number;
  /** Random rotation offset so simultaneous whirls don't look identical. */
  seed: number;
}

/** Spawns sparks that whirl tangentially around a point, for the tornado's spin. */
export function spawnSwirlSparks(x: number, y: number, count: number): Spark[] {
  const sparks: Spark[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 170 + Math.random() * 230;
    const tangent = angle + Math.PI / 2;
    sparks.push({
      x: x + Math.cos(angle) * 12,
      y: y + Math.sin(angle) * 12,
      vx: Math.cos(tangent) * speed - Math.sin(angle) * 50,
      vy: Math.sin(tangent) * speed - 80,
      life: Math.random() * 0.15,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      size: 2 + Math.random() * 2.4,
    });
  }
  return sparks;
}

export interface SceneState {
  bumpers: Bumper[];
  ball: Ball;
  trail: Vec[];
  flashes: Flash[];
  sparks: Spark[];
  whirls: TornadoWhirl[];
  /** Plunger pull, 0–100 — positions the spring handle in the launch lane. */
  launcherPower: number;
  /** True while aiming: the plunger shows its interactive pull hints. */
  showLauncher: boolean;
  ballVisible: boolean;
  /** Fresca carries the ball during her rush — hide it. */
  ballHeld: boolean;
}

function drawPitchSurface(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const stripeWidth = WORLD_W / 10;
  ctx.fillStyle = PALETTE.grassLight;
  for (let i = 0; i < 10; i += 2) {
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, WORLD_H);
  }

  const vignette = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_H * 0.25,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_H * 0.95,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function drawChalkLines(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = PALETTE.chalk;
  ctx.lineWidth = 4;

  ctx.strokeRect(26, 26, WORLD_W - 52, WORLD_H - 52);

  // Penalty box + six yard box in front of the goal.
  ctx.strokeRect(212, 26, 426, 210);
  ctx.strokeRect(314, 26, 222, 104);

  // Penalty arc.
  ctx.beginPath();
  ctx.arc(WORLD_W / 2, 176, 82, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  // Centre circle sits low on this half-pitch layout.
  ctx.beginPath();
  ctx.arc(WORLD_W / 2, WORLD_H - 40, 150, Math.PI, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(WORLD_W / 2, 150, 5, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.chalk;
  ctx.fill();
}

/**
 * The patrol lane the automated keeper dives along: a vertical corridor in
 * front of the goal. Chalk-dashed so it reads as a pitch marking.
 */
function drawShotLane(ctx: CanvasRenderingContext2D): void {
  const top = GOAL_MOUTH_Y - 6;
  const bottom = WORLD_H - 44;
  const half = GOALIE_MAX_LATERAL;
  ctx.save();
  ctx.fillStyle = "rgba(226,59,59,0.12)";
  ctx.fillRect(GOAL_CENTER_X - half, top, half * 2, bottom - top);
  ctx.setLineDash([9, 9]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(GOAL_CENTER_X - half, top);
  ctx.lineTo(GOAL_CENTER_X - half, bottom);
  ctx.moveTo(GOAL_CENTER_X + half, top);
  ctx.lineTo(GOAL_CENTER_X + half, bottom);
  ctx.stroke();
  ctx.strokeStyle = "rgba(226,59,59,0.6)";
  ctx.beginPath();
  ctx.moveTo(GOAL_CENTER_X, top);
  ctx.lineTo(GOAL_CENTER_X, bottom);
  ctx.stroke();
  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D): void {
  const width = GOAL_RIGHT - GOAL_LEFT;
  const height = GOAL_MOUTH_Y - GOAL_BACK_Y;

  // Net.
  ctx.save();
  ctx.beginPath();
  ctx.rect(GOAL_LEFT, GOAL_BACK_Y, width, height);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.fillRect(GOAL_LEFT, GOAL_BACK_Y, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  for (let x = GOAL_LEFT; x <= GOAL_RIGHT; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, GOAL_BACK_Y);
    ctx.lineTo(x, GOAL_MOUTH_Y);
    ctx.stroke();
  }
  for (let y = GOAL_BACK_Y; y <= GOAL_MOUTH_Y; y += 16) {
    ctx.beginPath();
    ctx.moveTo(GOAL_LEFT, y);
    ctx.lineTo(GOAL_RIGHT, y);
    ctx.stroke();
  }
  ctx.restore();

  // Frame.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = POST_R * 2 + 7;
  ctx.beginPath();
  ctx.moveTo(GOAL_LEFT, GOAL_MOUTH_Y);
  ctx.lineTo(GOAL_LEFT, GOAL_BACK_Y);
  ctx.lineTo(GOAL_RIGHT, GOAL_BACK_Y);
  ctx.lineTo(GOAL_RIGHT, GOAL_MOUTH_Y);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.red;
  ctx.lineWidth = POST_R * 2;
  ctx.beginPath();
  ctx.moveTo(GOAL_LEFT, GOAL_MOUTH_Y);
  ctx.lineTo(GOAL_LEFT, GOAL_BACK_Y);
  ctx.lineTo(GOAL_RIGHT, GOAL_BACK_Y);
  ctx.lineTo(GOAL_RIGHT, GOAL_MOUTH_Y);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(GOAL_LEFT - 2, GOAL_MOUTH_Y - 6);
  ctx.lineTo(GOAL_LEFT - 2, GOAL_BACK_Y - 2);
  ctx.lineTo(GOAL_RIGHT - 4, GOAL_BACK_Y - 2);
  ctx.stroke();
}

function drawBumper(ctx: CanvasRenderingContext2D, bumper: Bumper): void {
  ctx.save();
  ctx.translate(bumper.x, bumper.y);

  // Dark puck base.
  ctx.beginPath();
  ctx.ellipse(0, 10, BUMPER_R + 4, BUMPER_R * 0.72, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 7, BUMPER_R + 2, BUMPER_R * 0.78, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2C2C2C";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();

  // Lemon cap.
  ctx.beginPath();
  ctx.arc(0, 0, BUMPER_R, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(-6, -8, 2, 0, 0, BUMPER_R);
  gradient.addColorStop(0, "#FFE38A");
  gradient.addColorStop(0.55, PALETTE.lemon);
  gradient.addColorStop(1, PALETTE.lemonDeep);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-6, -9, BUMPER_R * 0.34, BUMPER_R * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fill();

  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: Vec[]): void {
  if (trail.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < trail.length; i += 1) {
    const t = i / trail.length;
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + t * 0.42})`;
    ctx.lineWidth = 2 + t * 9;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
  ctx.save();
  ctx.translate(ball.x, ball.y);

  ctx.beginPath();
  ctx.ellipse(2, 9, BALL_R * 0.95, BALL_R * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.rotate(ball.spin);
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.white;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();

  // Pentagon pattern.
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * BALL_R * 0.42;
    const py = Math.sin(angle) * BALL_R * 0.42;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + Math.PI / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * BALL_R * 0.82, Math.sin(angle) * BALL_R * 0.82, BALL_R * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Pinball-style spring launcher on the right edge. The ball rests on the
 * plunger; pulling it down charges the launch, releasing fires the ball up
 * the lane into the corner bumpers.
 */
function drawLauncher(ctx: CanvasRenderingContext2D, power: number, showHints: boolean): void {
  const laneLeft = LAUNCH_X - 30;
  const laneRight = WORLD_W - 10;
  const laneTop = 150;
  const laneBottom = WORLD_H - 12;

  ctx.save();

  // Shaded launch lane with rails.
  ctx.fillStyle = "rgba(26,26,26,0.32)";
  ctx.fillRect(laneLeft, laneTop, laneRight - laneLeft, laneBottom - laneTop);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(laneLeft, laneTop, laneRight - laneLeft, laneBottom - laneTop);

  const handleY = LAUNCH_Y + (power / 100) * PLUNGER_MAX_PULL;

  // Spring coil between the handle and the lane floor.
  const baseY = laneBottom - 6;
  ctx.strokeStyle = "#8A5A2B";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  const coils = 7;
  const coilHeight = (baseY - (handleY + 14)) / coils;
  ctx.moveTo(LAUNCH_X, handleY + 14);
  for (let i = 1; i <= coils; i += 1) {
    const y = handleY + 14 + i * coilHeight;
    const x = i % 2 === 0 ? LAUNCH_X + 15 : LAUNCH_X - 15;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Plunger handle bar + knob.
  ctx.fillStyle = PALETTE.tangerine;
  ctx.fillRect(laneLeft + 6, handleY - 9, laneRight - laneLeft - 12, 18);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(laneLeft + 6, handleY - 9, laneRight - laneLeft - 12, 18);
  ctx.beginPath();
  ctx.arc(LAUNCH_X, handleY, 11, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.lemon;
  ctx.fill();
  ctx.stroke();

  if (showHints) {
    // Faint charge arrows hinting the pull direction.
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 3; i += 1) {
      const y = laneTop + 26 + i * 16;
      ctx.beginPath();
      ctx.moveTo(LAUNCH_X - 8, y);
      ctx.lineTo(LAUNCH_X + 8, y);
      ctx.lineTo(LAUNCH_X, y + 9);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawFlashes(ctx: CanvasRenderingContext2D, flashes: Flash[]): void {
  ctx.save();
  for (const flash of flashes) {
    const radius = 22 + flash.life * 52;
    ctx.globalAlpha = Math.max(0, 1 - flash.life);
    ctx.lineWidth = 6 * (1 - flash.life) + 2;
    ctx.strokeStyle = flash.color;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[]): void {
  if (sparks.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  for (const spark of sparks) {
    const t = Math.max(0, 1 - spark.life);
    ctx.globalAlpha = t;
    ctx.strokeStyle = spark.color;
    ctx.lineWidth = Math.max(spark.size * t, 0.6);
    ctx.beginPath();
    ctx.moveTo(spark.x, spark.y);
    // Short streak trailing opposite the spark's motion.
    ctx.lineTo(spark.x - spark.vx * 0.032, spark.y - spark.vy * 0.032);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Bolivia's tornado vortex: counter-rotating spiral arms that expand and fade.
 * Tangerine, lemon, and white arms spin in opposite directions for depth.
 */
function drawTornadoWhirls(ctx: CanvasRenderingContext2D, whirls: TornadoWhirl[]): void {
  if (whirls.length === 0) return;
  const arms = [
    { color: "rgba(255,122,26,", width: 7 },
    { color: "rgba(255,201,60,", width: 5 },
    { color: "rgba(255,255,255,", width: 3 },
  ];
  for (const whirl of whirls) {
    const t = Math.max(0, Math.min(1, whirl.life));
    const alpha = 1 - t;
    const radius = (0.4 + t * 0.8) * BOLIVIA_TORNADO_RADIUS * whirl.scale;
    const rotation = whirl.seed + t * 9;
    ctx.save();
    ctx.translate(whirl.x, whirl.y);
    ctx.lineCap = "round";
    arms.forEach((arm, index) => {
      const start = rotation + (index * Math.PI * 2) / arms.length;
      const width = arm.width * (1 - t) + 1.5;
      // Outer spinning arm.
      ctx.beginPath();
      ctx.arc(0, 0, radius, start, start + 1.9);
      ctx.strokeStyle = `${arm.color}${alpha * 0.85})`;
      ctx.lineWidth = width;
      ctx.stroke();
      // Counter-rotating inner arm for vortex depth.
      const innerStart = -rotation * 1.4 + (index * Math.PI * 2) / arms.length;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55, innerStart, innerStart + 1.5);
      ctx.strokeStyle = `${arm.color}${alpha * 0.5})`;
      ctx.lineWidth = width * 0.7;
      ctx.stroke();
    });
    ctx.restore();
  }
}

/** Draws the whole pitch scene in world coordinates. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: SceneState): void {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  drawPitchSurface(ctx);
  drawChalkLines(ctx);
  drawShotLane(ctx);
  drawLauncher(ctx, scene.launcherPower, scene.showLauncher);
  drawGoal(ctx);

  for (const bumper of scene.bumpers) {
    drawBumper(ctx, bumper);
  }

  drawFlashes(ctx, scene.flashes);
  drawSparks(ctx, scene.sparks);
  drawTornadoWhirls(ctx, scene.whirls);
  drawTrail(ctx, scene.trail);

  if (scene.ballVisible && !scene.ballHeld) {
    drawBall(ctx, scene.ball);
  }
}
