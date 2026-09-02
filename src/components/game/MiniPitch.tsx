import { GOAL_LEFT, GOAL_MOUTH_Y, GOAL_RIGHT, WORLD_H, WORLD_W } from "@/game/constants";
import type { LevelConfig } from "@/game/levels";

interface MiniPitchProps {
  level: LevelConfig;
}

/** Small diagram of a pitch showing how crowded its bumper layout is. */
export function MiniPitch({ level }: MiniPitchProps) {
  return (
    <svg
      viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="h-full w-full"
      role="img"
      aria-label={`${level.label} pitch with ${level.bumperCount} bumpers`}
    >
      <defs>
        <pattern id={`stripes-${level.id}`} width={WORLD_W / 5} height={WORLD_H} patternUnits="userSpaceOnUse">
          <rect width={WORLD_W / 10} height={WORLD_H} fill="#58B368" />
          <rect x={WORLD_W / 10} width={WORLD_W / 10} height={WORLD_H} fill="#6BC27A" />
        </pattern>
      </defs>

      <rect width={WORLD_W} height={WORLD_H} fill={`url(#stripes-${level.id})`} />

      <g stroke="rgba(255,255,255,0.8)" strokeWidth={5} fill="none">
        <rect x={24} y={24} width={WORLD_W - 48} height={WORLD_H - 48} />
        <rect x={212} y={24} width={426} height={210} />
        <circle cx={WORLD_W / 2} cy={WORLD_H - 40} r={150} />
      </g>

      <g>
        <rect
          x={GOAL_LEFT}
          y={40}
          width={GOAL_RIGHT - GOAL_LEFT}
          height={GOAL_MOUTH_Y - 40}
          fill="rgba(255,255,255,0.35)"
          stroke="#1A1A1A"
          strokeWidth={16}
        />
        <rect
          x={GOAL_LEFT}
          y={40}
          width={GOAL_RIGHT - GOAL_LEFT}
          height={GOAL_MOUTH_Y - 40}
          fill="none"
          stroke="#E23B3B"
          strokeWidth={10}
        />
      </g>

      {level.bumpers.map((bumper) => (
        <g key={bumper.id}>
          <circle cx={bumper.x} cy={bumper.y + 8} r={26} fill="rgba(0,0,0,0.35)" />
          <circle cx={bumper.x} cy={bumper.y} r={24} fill="#FFC93C" stroke="#1A1A1A" strokeWidth={6} />
        </g>
      ))}
    </svg>
  );
}
