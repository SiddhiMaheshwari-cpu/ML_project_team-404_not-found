import React, { useEffect, useRef } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Neural-network "hologram": a dense node mesh biased toward the upper centre
// (like the reference), with a few bright hub nodes. Capped at ~30fps, paused
// when the tab is hidden, drawn once (static) for reduced-motion users.
function NeuralField() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let w = 0;
    let h = 0;
    let nodes = [];
    let raf = 0;
    let last = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(34, Math.min(90, Math.floor((w * h) / 16000)));
      nodes = Array.from({ length: count }, (_, i) => {
        // cluster ~60% of the nodes around the upper-centre "brain"
        const clustered = i % 5 < 3;
        const gx = (Math.random() + Math.random() + Math.random()) / 3;
        const gy = (Math.random() + Math.random()) / 2;
        return {
          x: clustered ? w * (0.2 + gx * 0.7) : Math.random() * w,
          y: clustered ? h * gy * 0.75 : Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          hub: i % 11 === 0,
        };
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const LINK = Math.min(210, w * 0.2);
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            const k = 1 - d / LINK;
            ctx.strokeStyle = `rgba(40,225,255,${k * (a.hub || b.hub ? 0.5 : 0.34)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        if (n.hub) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 16);
          g.addColorStop(0, "rgba(120,250,255,0.9)");
          g.addColorStop(1, "rgba(25,240,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(160,252,255,0.9)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.hub ? 2.6 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = (t) => {
      raf = requestAnimationFrame(step);
      if (document.hidden || t - last < 33) return;
      last = t;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      draw();
    };

    resize();
    draw();
    if (!reducedMotion()) raf = requestAnimationFrame(step);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="au-canvas" aria-hidden="true" />;
}

// Large HUD rings / arcs behind the header, like the reference.
function HudRings() {
  return (
    <svg className="au-rings" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <radialGradient id="au-ring-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#19f0ff" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#19f0ff" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <g transform="translate(980 300)" fill="none" stroke="#19f0ff">
        <g className="au-ring-a">
          <circle r="470" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 10" />
          <path d="M-470 0 A470 470 0 0 1 0 -470" strokeOpacity="0.5" strokeWidth="2" />
          <path d="M470 0 A470 470 0 0 1 330 332" strokeOpacity="0.4" strokeWidth="2" />
        </g>
        <g className="au-ring-b">
          <circle r="350" strokeOpacity="0.26" strokeWidth="1" />
          <circle r="350" strokeOpacity="0.45" strokeWidth="6" strokeDasharray="90 1110" />
          <circle r="350" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="1 7" transform="scale(0.94)" />
        </g>
        <g className="au-ring-a">
          <circle r="240" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="14 6 2 6" />
          <path d="M-240 0 A240 240 0 0 0 0 240" strokeOpacity="0.55" strokeWidth="2" />
        </g>
        <circle r="130" strokeOpacity="0.2" strokeWidth="1" />
        <path d="M-520 0H520M0 -520V520" strokeOpacity="0.07" />
      </g>
    </svg>
  );
}

// Wireframe robotic hand reaching in from the screen edge (decorative).
const FINGERS = [
  [[70, 105], [128, 82], [168, 72], [200, 70]],
  [[80, 135], [142, 121], [188, 117], [218, 116]],
  [[84, 170], [148, 166], [192, 168], [216, 172]],
  [[82, 205], [138, 211], [178, 220], [204, 232]],
  [[70, 250], [108, 284], [136, 308], [156, 334]],
];
const PALM = "0,118 70,100 92,200 72,262 0,272";

function Hand({ side }) {
  return (
    <svg className={`au-hand ${side}`} viewBox="0 0 230 360" aria-hidden="true">
      <polygon points={PALM} fill="rgba(25,240,255,0.05)" stroke="rgba(25,240,255,0.55)" strokeWidth="1.2" />
      <path d="M0 118L92 200M0 272L92 200M70 100L72 262M0 190H92" stroke="rgba(25,240,255,0.25)" strokeWidth="0.8" fill="none" />
      {FINGERS.map((f, i) => (
        <g key={i}>
          <polyline points={f.map((p) => p.join(",")).join(" ")} fill="none" stroke="rgba(25,240,255,0.12)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={f.map((p) => p.join(",")).join(" ")} fill="none" stroke="rgba(110,245,255,0.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          {f.slice(1).map((p, k) => (
            <circle key={k} cx={p[0]} cy={p[1]} r={k === f.length - 2 ? 3.2 : 4.6} fill="#04121f" stroke="#7af6ff" strokeWidth="1.2" />
          ))}
        </g>
      ))}
    </svg>
  );
}

function SideTelemetry({ isConnected, scans }) {
  const rows = [
    ["LINK", isConnected ? "ONLINE" : "OFFLINE"],
    ["SCANS", String(scans).padStart(3, "0")],
    ["MODE", "HITL"],
  ];
  return (
    <>
      <div className="au-tele left" aria-hidden="true">
        {rows.map(([k, v]) => (
          <div key={k}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>
      <div className="au-ticks" aria-hidden="true" />
    </>
  );
}

export default function AmbientBackground({ isConnected = false, scans = 0 }) {
  return (
    <>
      <div className="au-grid" aria-hidden="true" />
      <div className="au-glow" aria-hidden="true" />
      <div className="au-glow b" aria-hidden="true" />
      <HudRings />
      <NeuralField />
      <Hand side="l" />
      <Hand side="r" />
      <SideTelemetry isConnected={isConnected} scans={scans} />
      <div className="au-scan" aria-hidden="true" />
      <span className="au-corner tl" aria-hidden="true" />
      <span className="au-corner tr" aria-hidden="true" />
      <span className="au-corner bl" aria-hidden="true" />
      <span className="au-corner br" aria-hidden="true" />
    </>
  );
}
