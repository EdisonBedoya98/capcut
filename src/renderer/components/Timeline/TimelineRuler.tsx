import React from 'react';

interface TimelineRulerProps {
  zoom: number;
  duration: number;
  scrollX: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ zoom, duration }) => {
  // Calculate interval based on zoom level
  let interval = 1; // seconds between marks
  if (zoom < 20) interval = 10;
  else if (zoom < 40) interval = 5;
  else if (zoom < 80) interval = 2;
  else if (zoom < 150) interval = 1;
  else interval = 0.5;

  const marks: { time: number; major: boolean }[] = [];
  for (let t = 0; t <= duration + interval; t += interval) {
    marks.push({ time: t, major: t % (interval * 2) === 0 || interval <= 1 });
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}s`;
  };

  return (
    <svg className="w-full h-full" style={{ overflow: 'visible' }}>
      {marks.map(({ time, major }) => {
        const x = time * zoom;
        return (
          <g key={time}>
            <line
              x1={x}
              y1={major ? 8 : 14}
              x2={x}
              y2={24}
              stroke={major ? '#8899aa' : '#3a3a5a'}
              strokeWidth={major ? 1 : 0.5}
            />
            {major && (
              <text
                x={x + 4}
                y={12}
                fill="#8899aa"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatTime(time)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
