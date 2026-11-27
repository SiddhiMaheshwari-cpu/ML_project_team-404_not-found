import React from "react";
import useAnimatedNumber from "../hooks/useAnimatedNumber";
import { BrainIcon, ActivityIcon } from "./Icons";

const R = 44;
const CIRC = 2 * Math.PI * R;
const TICKS = Array.from({ length: 60 }, (_, i) => i);

function MlGauge({ value, scans }) {
  const animated = useAnimatedNumber(value ?? 0, 900);
  const has = value != null;
  const offset = CIRC * (1 - Math.min(Math.max(animated, 0), 100) / 100);

  return (
    <div className="au-gauge" role="img" aria-label={has ? `Predicted repair confidence ${value.toFixed(1)} percent` : "Repair confidence not available"}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(25,240,255,0.18)" strokeWidth="0.6" />
        <g className="au-gauge-spin">
          {TICKS.map((i) => (
            <line
              key={i}
              x1="50" y1="6.5" x2="50" y2={i % 5 === 0 ? "9.8" : "8.4"}
              stroke="rgba(160,240,255,0.5)" strokeWidth={i % 5 === 0 ? 0.6 : 0.35}
              transform={`rotate(${i * 6} 50 50)`}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r={R - 6} fill="none" stroke="rgba(25,240,255,0.12)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(25,240,255,0.14)" strokeWidth="5" />
        {has && (
          <circle
            className="au-gauge-arc"
            cx="50" cy="50" r={R} fill="none" stroke="#19f0ff" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={offset}
          />
        )}
      </svg>
      <div className="val">
        {has ? <span className="big">{animated.toFixed(1)}%</span> : <span className="big na">N/A</span>}
        <span className="lbl">Confidence</span>
      </div>
    </div>
  );
}

function complexityTone(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("easy") || l.includes("low") || l.includes("simple")) return { cls: "teal", tile: "teal" };
  if (l.includes("hard") || l.includes("high") || l.includes("complex")) return { cls: "red", tile: "red" };
  if (l) return { cls: "amber", tile: "amber" };
  return { cls: "grey", tile: "" };
}

function Stat({ label, value, tip }) {
  const n = useAnimatedNumber(value, 500);
  return (
    <div className="au-stat au-tip left" tabIndex={0} data-tip={tip}>
      <span>{label}</span>
      <b>{Math.round(n)}</b>
    </div>
  );
}

export default function DiagnosticsPanel({ mlConfidence, mlComplexity, stats, lastRun }) {
  const tone = complexityTone(mlComplexity);
  const noMl = mlConfidence == null && mlComplexity == null;
  const mlNote =
    stats.scans === 0
      ? "Waiting for the first scan…"
      : noMl
      ? "No ML prediction for the latest run (models may not be loaded on the backend)."
      : "Predicted by the trained regression model from log length, file size and line count.";

  return (
    <section id="au-diagnostics" className="au-panel d2">
      <div className="au-panel-head">
        <h2 className="au-panel-title"><BrainIcon size={22} /> ML &amp; Diagnostic Insights</h2>
        <span className="au-sub">Live from backend</span>
      </div>

      <div className="au-diag">
        <div className="au-tile span-row">
          <h3>ML Score</h3>
          <MlGauge value={mlConfidence} scans={stats.scans} />
          <p className="au-note" style={{ marginTop: 8 }}>{mlNote}</p>
        </div>

        <div className={`au-tile ${tone.tile}`}>
          <h3>Complexity</h3>
          <div className="au-complex">
            <span className={`au-badge ${tone.cls}`}>{mlComplexity ? String(mlComplexity).toUpperCase() : "—"}</span>
          </div>
          <p className="au-note">Classified from the error log by the NLP complexity model (Easy / Medium / Hard).</p>
        </div>

        <div className="au-tile">
          <h3><ActivityIcon size={18} style={{ color: "var(--au-cyan)" }} /> Session Stats</h3>
          <div className="au-statlist">
            <Stat label="Scans" value={stats.scans} tip="Files AURA has started analyzing since you opened this page." />
            <Stat label="Patches" value={stats.patches} tip="Scans that produced a suggested fix awaiting your decision." />
            <Stat label="Applied" value={stats.applied} tip="Patches you approved and the backend wrote to disk." />
          </div>
          <p className="au-note" style={{ marginTop: 8, textAlign: "left" }}>
            {lastRun ? `Last run ${lastRun.id ? `#${lastRun.id} ` : ""}took ${lastRun.duration}s` : "Counts reset when you reload."}
          </p>
        </div>
      </div>
    </section>
  );
}
