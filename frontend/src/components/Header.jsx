import React from "react";
import { CpuIcon } from "./Icons";

const NAV = [
  { id: "au-inspector", label: "Patch Inspector" },
  { id: "au-diagnostics", label: "Diagnostics" },
  { id: "au-activity", label: "Activity Log" },
  { id: "au-guide", label: "How AURA Works" },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function LogoMark({ working, color }) {
  return (
    <div className="au-logo" style={{ "--au-accent": color }}>
      <svg
        className={working ? "aura-spin-anim" : ""}
        style={working ? { animation: "aura-spin 1.1s linear infinite" } : undefined}
        width="30" height="30" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true"
      >
        <path d="M12 3a9 9 0 1 0 9 9" />
        <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
      </svg>
    </div>
  );
}

export default function Header({ isConnected, isWorking, awaitingApproval, accent, engineModel }) {
  const engineState = !isConnected ? "OFFLINE" : isWorking ? "ANALYZING" : awaitingApproval ? "AWAITING YOU" : "STANDING BY";
  const engineClass = !isConnected ? "bad" : isWorking ? "busy" : awaitingApproval ? "warn" : "";

  return (
    <>
      <header className="au-header">
        <div className="au-brand">
          <LogoMark working={isWorking} color={accent} />
          <div>
            <h1 className="au-title">AURA<span>-OS</span></h1>
            <p className="au-tagline">Multi-language self-healing pipeline with human approval</p>
          </div>
        </div>

        <div className="au-chips">
          <div className="au-chip-row">
            <span className="au-chip au-tip" tabIndex={0} data-tip="The Gemini model the backend uses to propose fixes (reported by the server on connect).">
              <CpuIcon size={16} /> ENGINE: <b>{engineModel || "awaiting backend"}</b>
            </span>
          </div>
          <div className="au-chip-row">
            <span className={`au-chip ${engineClass}`}>
              <span className={`au-dot ${isWorking ? "live" : ""}`} style={{ color: "currentColor" }}>
                <i /><i />
              </span>
              AI ENGINE: {engineState}
            </span>
            <span
              className={`au-chip ${isConnected ? "ok" : "bad"} au-tip right`}
              tabIndex={0}
              data-tip="Live WebSocket link to the AURA backend (127.0.0.1:8000)."
              role="status"
            >
              <span className={`au-dot ${isConnected ? "live" : ""}`}><i /><i /></span>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      <nav className="au-nav" aria-label="Sections">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => scrollToSection(n.id)}>
            {n.label}
          </button>
        ))}
      </nav>
    </>
  );
}
