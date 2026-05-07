import { useRef, useEffect, useState, useCallback, type FC } from "react";
import { useGameStore } from "@/stores/game.store";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDING = 40;

export const CrashChart: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { round, isCrashed } = useGameStore();
  const [flash, setFlash] = useState(false);

  // Flash red on crash
  useEffect(() => {
    if (isCrashed) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [isCrashed]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    // Background
    ctx.fillStyle = flash ? "#ff336608" : "#0f0f1a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = PADDING + (i / 10) * (CANVAS_WIDTH - PADDING * 2);
      const y = CANVAS_HEIGHT - PADDING - (i / 10) * (CANVAS_HEIGHT - PADDING * 2);
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, CANVAS_HEIGHT - PADDING);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(CANVAS_WIDTH - PADDING, y);
      ctx.stroke();
    }

    // Draw curve if round is running
    const multiplierX100 = round?.multiplierX100 ?? 100;
    const state = round?.state;

    if (state === "running" || state === "crashed") {
      const drawAreaWidth = CANVAS_WIDTH - PADDING * 2;
      const drawAreaHeight = CANVAS_HEIGHT - PADDING * 2;

      // Compute a simulated curve based on multiplier
      // multiplierX100 = 100 + floor(elapsedMs / 20)
      // elapsedMs = (multiplierX100 - 100) * 20
      // We want x to represent time, y to represent multiplier
      const maxMultiplier = Math.max(multiplierX100, 150);
      const points: { x: number; y: number }[] = [];
      const steps = 100;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const simulatedMultiplierX100 = 100 + Math.floor(progress * (multiplierX100 - 100));
        const elapsedMs = (simulatedMultiplierX100 - 100) * 20;

        // X: elapsed time normalized (max ~15 seconds for visual)
        const maxTimeMs = Math.max((maxMultiplier - 100) * 20, 5000);
        const xNorm = elapsedMs / maxTimeMs;
        const x = PADDING + xNorm * drawAreaWidth;

        // Y: multiplier normalized (log scale for better visuals)
        const m = simulatedMultiplierX100 / 100;
        const yNorm = Math.log(m) / Math.log(maxMultiplier / 100);
        const y = CANVAS_HEIGHT - PADDING - yNorm * drawAreaHeight;

        points.push({ x, y });
      }

      // Draw glow line
      ctx.shadowColor = state === "crashed" ? "#ff3366" : "#00ff88";
      ctx.shadowBlur = 15;
      ctx.strokeStyle = state === "crashed" ? "#ff3366" : "#00ff88";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Fill area under curve
      if (points.length > 0) {
        const gradient = ctx.createLinearGradient(
          0,
          CANVAS_HEIGHT - PADDING,
          0,
          PADDING
        );
        if (state === "crashed") {
          gradient.addColorStop(0, "#ff336610");
          gradient.addColorStop(1, "#ff336630");
        } else {
          gradient.addColorStop(0, "#00ff8810");
          gradient.addColorStop(1, "#00ff8830");
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(points[0].x, CANVAS_HEIGHT - PADDING);
        for (const p of points) {
          ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(points[points.length - 1].x, CANVAS_HEIGHT - PADDING);
        ctx.closePath();
        ctx.fill();
      }

      // Draw current dot
      if (points.length > 0) {
        const last = points[points.length - 1];
        ctx.fillStyle = state === "crashed" ? "#ff3366" : "#00ff88";
        ctx.beginPath();
        ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(last.x, last.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = state === "crashed" ? "#ff336640" : "#00ff8840";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Multiplier text overlay
    const displayValue = (multiplierX100 / 100).toFixed(2);
    const isRunning = state === "running";
    const isCrashedState = state === "crashed";

    ctx.font = "bold 72px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isCrashedState) {
      ctx.fillStyle = "#ff3366";
      ctx.fillText(`${displayValue}x`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.font = "bold 24px 'Inter', sans-serif";
      ctx.fillStyle = "#ff3366aa";
      ctx.fillText("CRASHED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    } else if (isRunning) {
      ctx.fillStyle = "#00ff88";
      ctx.fillText(`${displayValue}x`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else {
      ctx.fillStyle = "#888888";
      ctx.font = "bold 48px 'JetBrains Mono', monospace";
      ctx.fillText("1.00x", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  }, [round, flash]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      draw();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [draw]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-casino-border bg-[#0f0f1a] ${
        flash ? "animate-flash-red" : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        className="h-auto w-full"
        style={{ maxHeight: "400px" }}
      />
    </div>
  );
};
