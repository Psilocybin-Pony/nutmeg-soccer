import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { CHARACTER_BY_ID } from "@/game/characters";
import {
  GOALIE_ID,
  LAUNCH_X,
  MIN_PLUNGER_POWER,
  PLUNGER_MAX_PULL,
  STRIKER_BUMPER_HALF,
  STRIKER_BUMPER_THICK,
  STRIKER_R,
  WORLD_H,
  WORLD_W,
} from "@/game/constants";
import { drawScene } from "@/game/render";
import type { CharacterId, Striker } from "@/game/types";
import type { NutmegGame } from "@/hooks/useNutmegGame";
import { cn } from "@/lib/utils";

interface PitchFieldProps {
  game: NutmegGame;
}

interface DragState {
  id: CharacterId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

/** Pulling the plunger down charges the launch power. */
interface PullState {
  pointerId: number;
  startY: number;
  startPower: number;
}

const NUDGE_STEP = 14;
const PLUNGER_KEY_STEP = 8;

/** The playable pitch: canvas for the field, DOM tokens for the characters, plunger to launch. */
export function PitchField({ game }: PitchFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<NutmegGame>(game);
  const dragRef = useRef<DragState | null>(null);
  const pullRef = useRef<PullState | null>(null);
  const [scale, setScale] = useState<number>(1);

  gameRef.current = game;

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setScale(width / WORLD_W);
    });
    observer.observe(element);
    setScale(element.clientWidth / WORLD_W);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const current = gameRef.current;
      current.advance(dt);

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = container.clientWidth;
        const height = container.clientHeight;
        const targetW = Math.round(width * dpr);
        const targetH = Math.round(height * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const worldScale = (width / WORLD_W) * dpr;
          ctx.scale(worldScale, worldScale);
          drawScene(ctx, {
            bumpers: current.bumpers,
            ball: current.ballRef.current,
            trail: current.trailRef.current,
            flashes: current.flashesRef.current,
            sparks: current.sparksRef.current,
            whirls: current.whirlsRef.current,
            launcherPower: current.power,
            showLauncher: current.phase === "aiming",
            ballVisible: current.phase !== "scored",
            ballHeld: current.ballRef.current.held,
          });
        }
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  const toWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: ((clientX - rect.left) / rect.width) * WORLD_W,
        y: ((clientY - rect.top) / rect.height) * WORLD_H,
      };
    },
    [],
  );

  const handleStrikerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, striker: Striker) => {
      if (gameRef.current.phase !== "aiming" || striker.id === GOALIE_ID) return;
      event.stopPropagation();
      const point = toWorld(event.clientX, event.clientY);
      dragRef.current = {
        id: striker.id,
        pointerId: event.pointerId,
        offsetX: striker.x - point.x,
        offsetY: striker.y - point.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [toWorld],
  );

  const handleStrikerPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const point = toWorld(event.clientX, event.clientY);
      gameRef.current.moveStriker(drag.id, { x: point.x + drag.offsetX, y: point.y + drag.offsetY });
    },
    [toWorld],
  );

  const handleStrikerPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }, []);

  const handleStrikerKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, striker: Striker) => {
    const current = gameRef.current;
    if (current.phase !== "aiming" || striker.id === GOALIE_ID) return;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        current.moveStriker(striker.id, { x: striker.x - NUDGE_STEP, y: striker.y });
        break;
      case "ArrowRight":
        event.preventDefault();
        current.moveStriker(striker.id, { x: striker.x + NUDGE_STEP, y: striker.y });
        break;
      case "ArrowUp":
        event.preventDefault();
        current.moveStriker(striker.id, { x: striker.x, y: striker.y - NUDGE_STEP });
        break;
      case "ArrowDown":
        event.preventDefault();
        current.moveStriker(striker.id, { x: striker.x, y: striker.y + NUDGE_STEP });
        break;
      default:
        break;
    }
  }, []);

  const applyPull = useCallback(
    (clientY: number) => {
      const pull = pullRef.current;
      if (!pull) return;
      const pullPixels = Math.max(PLUNGER_MAX_PULL * scale, 1);
      gameRef.current.setPlunger(pull.startPower + ((clientY - pull.startY) / pullPixels) * 100);
    },
    [scale],
  );

  const handlePlungerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (gameRef.current.phase !== "aiming") return;
    event.stopPropagation();
    pullRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPower: gameRef.current.power,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePlungerPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pull = pullRef.current;
      if (!pull || pull.pointerId !== event.pointerId) return;
      applyPull(event.clientY);
    },
    [applyPull],
  );

  const handlePlungerPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pull = pullRef.current;
    if (!pull || pull.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pullRef.current = null;
    if (gameRef.current.power >= MIN_PLUNGER_POWER) {
      gameRef.current.launch();
    } else {
      gameRef.current.setPlunger(0);
    }
  }, []);

  const handlePlungerKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = gameRef.current;
    if (current.phase !== "aiming") return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      current.setPlunger(current.power + PLUNGER_KEY_STEP);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      current.setPlunger(current.power - PLUNGER_KEY_STEP);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (current.power >= MIN_PLUNGER_POWER) current.launch();
      else current.setPlunger(0);
    }
  }, []);

  const interactive = game.phase === "aiming";
  const tokenSize = STRIKER_R * 2 * scale;
  // Keep a comfortable touch target even when the pitch is scaled down on phones.
  const hitSize = Math.max(tokenSize, 46);
  const badgeSize = Math.max(26 * scale, 20);
  const badgeFont = Math.max(15 * scale, 11);

  // Plunger touch zone over the launch lane on the right edge.
  const laneLeft = (LAUNCH_X - 34) * scale;
  const laneWidth = (WORLD_W - LAUNCH_X + 30) * scale;
  const laneTop = 140 * scale;
  const laneHeight = (WORLD_H - 140) * scale;

  return (
    <div
      ref={containerRef}
      className="relative isolate w-full select-none overflow-hidden rounded-[22px] border-[4px] border-ink bg-grass shadow-comic-lg no-touch-scroll"
      style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      <div className="absolute inset-0">
        {game.strikers.map((striker) => {
          const meta = CHARACTER_BY_ID[striker.id];
          const isGoalie = striker.id === GOALIE_ID;
          // Fresca's rush: blur + ghosts while dashing, a landing pop after.
          const rush = striker.id === game.characterId ? game.rush : null;
          const dashing = rush !== null && !rush.landed;
          const landedPose = rush !== null && rush.landed;
          const dashAngle = rush ? (Math.atan2(rush.dirY, rush.dirX) * 180) / Math.PI : 0;
          const draggable = interactive && !isGoalie;
          return (
            <button
              key={striker.id}
              type="button"
              disabled={!draggable}
              onPointerDown={draggable ? (event) => handleStrikerPointerDown(event, striker) : undefined}
              onPointerMove={draggable ? handleStrikerPointerMove : undefined}
              onPointerUp={draggable ? handleStrikerPointerUp : undefined}
              onPointerCancel={draggable ? handleStrikerPointerUp : undefined}
              onKeyDown={(event) => handleStrikerKeyDown(event, striker)}
              onClick={(event) => event.preventDefault()}
              aria-label={
                isGoalie
                  ? `${meta.name}, number ${meta.number}, the automated goalkeeper. She dives and turns on her own to block your shot.`
                  : `${meta.name}, number ${meta.number}. Drag to position her. Superpower: ${meta.superpower.name}. ${meta.superpower.description}`
              }
              className={cn(
                "absolute rounded-full no-touch-scroll",
                draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
              )}
              style={{
                left: striker.x * scale,
                top: striker.y * scale,
                width: hitSize,
                height: hitSize,
                transform: "translate(-50%, -50%)",
                zIndex: Math.round(striker.y),
              }}
            >
              <span
                className="absolute left-1/2 top-1/2 block"
                style={{
                  width: tokenSize,
                  height: tokenSize,
                  transform: "translate(-50%, -50%)",
                  animation: landedPose ? "fresca-land-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
                }}
              >
                {dashing && rush ? (
                  <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                    {/* Motion streak trailing opposite her dash direction. */}
                    <span
                      className="absolute left-1/2 top-1/2 rounded-full"
                      style={{
                        width: 130 * scale,
                        height: 9 * scale,
                        transformOrigin: "left center",
                        transform: `translate(0, -50%) rotate(${dashAngle + 180}deg)`,
                        background:
                          "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 100%)",
                      }}
                    />
                    {/* Ghost after-images of her dash, fading with distance. */}
                    {[18, 36, 56].map((offset, ghostIndex) => (
                      <span
                        key={offset}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          width: tokenSize,
                          height: tokenSize,
                          transform: `translate(-50%, -50%) translate(${-rush.dirX * offset * scale}px, ${-rush.dirY * offset * scale}px)`,
                          opacity: 0.42 - ghostIndex * 0.12,
                          filter: "blur(2px)",
                        }}
                      >
                        <img
                          src={meta.image}
                          alt=""
                          draggable={false}
                          className="pointer-events-none absolute left-1/2 max-w-none"
                          style={{ height: 136 * scale, bottom: 22 * scale, transform: "translateX(-50%)" }}
                        />
                      </span>
                    ))}
                  </span>
                ) : null}

                {/* Base disc. */}
                <span
                  className="absolute inset-0 block rounded-full border-[3px] border-ink"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #4A4A4A, #171717 70%)`,
                    boxShadow: "0 3px 0 rgba(0,0,0,0.35)",
                  }}
                />

                <img
                  src={meta.image}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 max-w-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)]"
                  style={{
                    height: 136 * scale,
                    bottom: 22 * scale,
                    transform: "translateX(-50%)",
                    filter: dashing ? "blur(2.5px)" : undefined,
                  }}
                />

                {/* The keeper's save bar — the only live surface she has. */}
                {isGoalie ? (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `rotate(${striker.angle}deg)` }}
                    aria-hidden="true"
                  >
                    <span
                      className="absolute left-1/2 top-0 rounded-full border-[3px] border-ink"
                      style={{
                        width: STRIKER_BUMPER_HALF * 2 * scale,
                        height: STRIKER_BUMPER_THICK * scale,
                        transform: "translate(-50%, -50%)",
                        background: `linear-gradient(180deg, #FFB067 0%, ${meta.tint} 62%)`,
                        boxShadow: "0 2px 0 rgba(0,0,0,0.4)",
                      }}
                    />
                  </span>
                ) : null}

                <span
                  className="pointer-events-none absolute left-1/2 flex items-center justify-center rounded-full border-[2px] border-ink bg-lemon font-display text-ink"
                  style={{
                    width: badgeSize,
                    height: badgeSize,
                    bottom: -8 * scale,
                    marginLeft: -badgeSize / 2,
                    fontSize: badgeFont,
                    lineHeight: 1,
                    paddingTop: 3 * scale,
                  }}
                >
                  {meta.number}
                </span>

                {isGoalie ? (
                  <span
                    className="pointer-events-none absolute left-1/2 rounded-full border-[2px] border-ink bg-goalred font-display text-white"
                    style={{
                      bottom: -38 * scale,
                      transform: "translateX(-50%)",
                      padding: `${Math.max(2 * scale, 1)}px ${Math.max(7 * scale, 4)}px`,
                      fontSize: Math.max(12 * scale, 9),
                      lineHeight: 1,
                    }}
                  >
                    GK
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pinball plunger: drag down to charge, release to fire. */}
      <div
        role="slider"
        tabIndex={interactive ? 0 : -1}
        aria-label="Launch plunger"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={game.power}
        aria-disabled={!interactive}
        className={cn(
          "absolute no-touch-scroll outline-none",
          interactive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
        )}
        style={{ left: laneLeft, top: laneTop, width: laneWidth, height: laneHeight }}
        onPointerDown={handlePlungerPointerDown}
        onPointerMove={handlePlungerPointerMove}
        onPointerUp={handlePlungerPointerUp}
        onPointerCancel={handlePlungerPointerUp}
        onKeyDown={handlePlungerKeyDown}
      >
        {interactive ? (
          <>
            <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border-[2px] border-ink bg-lemon px-2 py-0.5 font-display text-[11px] text-ink sm:text-xs">
              PULL!
            </span>
            {game.power > 0 ? (
              <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[2px] border-ink bg-white px-2 py-0.5 font-display text-xs text-ink">
                {game.power}%
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {game.phase === "flying" ? (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border-[3px] border-ink bg-white/95 px-4 py-1 font-display text-lg text-ink shadow-comic-sm">
          {game.rush
            ? game.rush.landed
              ? "Fresca fires!"
              : "Blur rush!"
            : game.liveHits > 0
              ? `${game.liveHits} hit combo!`
              : "Ball in play"}
        </div>
      ) : null}
    </div>
  );
}
