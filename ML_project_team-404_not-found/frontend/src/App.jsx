import React, { useState, useEffect, useRef } from 'react';

const WS_URL = "ws://127.0.0.1:8000/ws";

const STAGES = [
  { title: "Intercept", desc: "Catches the failed run", color: "#f5a524", icon: "alert" },
  { title: "Analyze", desc: "Parses the code, asks Gemini", color: "#4aa3ff", icon: "search" },
  { title: "Synthesize", desc: "Writes and saves the patch", color: "#3ecf8e", icon: "code" },
];

const css = `
@keyframes aura-ring { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(2.6); opacity: 0 } }
@keyframes aura-sweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }
@keyframes aura-in { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: none } }
@keyframes aura-rise { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes aura-pop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.15) } 100% { transform: scale(1); opacity: 1 } }
@keyframes aura-spin { to { transform: rotate(360deg) } }
@keyframes aura-blink { 50% { opacity: 0 } }
.aura-ring { animation: aura-ring 1.8s ease-out infinite }
.aura-sweep { animation: aura-sweep 1.3s ease-in-out infinite }
.aura-in { animation: aura-in .3s ease-out both }
.aura-rise { animation: aura-rise .35s ease-out both }
.aura-pop { animation: aura-pop .4s ease-out both }
.aura-spin { animation: aura-spin 1.1s linear infinite }
.aura-blink { animation: aura-blink 1s steps(1) infinite }
@media (prefers-reduced-motion: reduce) {
  .aura-ring, .aura-sweep, .aura-in, .aura-rise, .aura-pop, .aura-spin, .aura-blink { animation: none }
}
`;

function now() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function makeLog(level, text) {
  return { time: now(), level, text };
}

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([
    makeLog("info", "AURA started. Waiting for failures in the monitored directory."),
  ]);
  const [patchCode, setPatchCode] = useState("");
  const [patchFile, setPatchFile] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (typeof WebSocket === 'undefined') return;

    let ws = null;
    const timeouts = [];

    const clearActiveTimeouts = () => {
      while (timeouts.length > 0) {
        clearTimeout(timeouts.pop());
      }
    };

    const addLog = (level, text) => setLogs((prev) => [...prev, makeLog(level, text)]);

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === "success") {
            const name = data.filename || "file";
            clearActiveTimeouts();
            setActiveStep(1);
            setPatchFile(name);
            addLog("warn", `Failure caught in ${name}.`);
            setPatchCode("");

            const t1 = setTimeout(() => {
              setActiveStep(2);
              addLog("info", "Analyzing the error and asking Gemini for a fix.");

              const t2 = setTimeout(() => {
                setActiveStep(3);
                setPatchCode(data.patch || "");
                addLog("success", `Patch saved. ${name} has been fixed.`);
              }, 1500);
              timeouts.push(t2);
            }, 1000);
            timeouts.push(t1);
          } else {
            addLog("error", data.message || "Operation failed.");
          }
        } catch {
          addLog("error", "Could not read the message from the server.");
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }

    return () => {
      clearActiveTimeouts();
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
  }, []);

  const isWorking = activeStep > 0 && activeStep < 3;
  const headline = !isConnected
    ? "Backend not reachable"
    : isWorking
    ? "Fixing the failure"
    : activeStep === 3
    ? "Fix saved"
    : "Waiting for a failure";
  const accent = !isConnected
    ? "#ef5b5b"
    : activeStep === 0
    ? "#8b9bb0"
    : STAGES[Math.min(activeStep, 3) - 1].color;

  return (
    <div className="min-h-screen bg-[#0e1319] text-[#d5dde8]">
      <style>{css}</style>

      <div className="max-w-6xl mx-auto px-5 py-7 sm:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            <LogoMark working={isWorking} color={accent} />
            <div>
              <h1 className="text-xl font-semibold text-white leading-tight">AURA</h1>
              <p className="text-sm text-[#7f8da0]">Self-healing pipeline for Python files</p>
            </div>
          </div>

          <div
            className="flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm"
            style={{
              borderColor: isConnected ? "#1f4a37" : "#52262a",
              background: isConnected ? "#10231c" : "#251416",
              color: isConnected ? "#6fe0aa" : "#f08a8a",
            }}
          >
            <span className="relative flex w-2.5 h-2.5">
              {isConnected && (
                <span className="aura-ring absolute inset-0 rounded-full bg-[#3ecf8e]" />
              )}
              <span
                className="relative w-2.5 h-2.5 rounded-full"
                style={{ background: isConnected ? "#3ecf8e" : "#ef5b5b" }}
              />
            </span>
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </header>

        {/* Status banner */}
        <section
          className="relative overflow-hidden rounded-lg border bg-[#141a22] px-5 py-4 mb-6 transition-colors duration-500"
          style={{ borderColor: accent + "66" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-1.5 self-stretch rounded-full transition-colors duration-500"
              style={{ background: accent }}
            />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">{headline}</h2>
              <p className="text-sm text-[#7f8da0] mt-0.5">
                {activeStep === 0
                  ? "Save a Python file in the monitored folder. If it errors, AURA writes a fix."
                  : patchFile
                  ? `Working on ${patchFile}`
                  : ""}
              </p>
            </div>
          </div>
          {isWorking && (
            <div className="absolute left-0 bottom-0 h-0.5 w-full bg-[#1c2530]">
              <div
                className="aura-sweep h-full w-1/4"
                style={{ background: accent }}
              />
            </div>
          )}
        </section>

        {/* Pipeline stages */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {STAGES.map((stage, i) => (
            <StageCard key={stage.title} stage={stage} number={i + 1} activeStep={activeStep} />
          ))}
        </div>

        {/* Log + patch */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-2 rounded-lg overflow-hidden border border-[#252d38] bg-[#141a22] flex flex-col">
            <PanelHeader title="Activity log" />
            <div className="bg-[#0a0e13] h-80 overflow-y-auto p-4 font-mono text-[13px] leading-6">
              {logs.map((log, idx) => (
                <div key={idx} className="aura-in flex gap-3">
                  <span className="text-[#4d5a6b] shrink-0">{log.time}</span>
                  <span
                    className="whitespace-pre-wrap break-words"
                    style={{ color: LOG_COLORS[log.level] || LOG_COLORS.info }}
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              <div className="flex gap-3">
                <span className="text-[#4d5a6b]">{now()}</span>
                <span className="aura-blink inline-block w-2 h-4 mt-1 bg-[#4aa3ff]" />
              </div>
              <div ref={logsEndRef} />
            </div>
          </section>

          <section className="lg:col-span-3 rounded-lg overflow-hidden border border-[#252d38] bg-[#141a22] flex flex-col min-w-0">
            <PanelHeader title="Patch" right={patchCode ? patchFile : ""} />
            <div className="bg-[#0a0e13] h-80 overflow-auto">
              {patchCode ? (
                <DiffView code={patchCode} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[#5d6b7d]">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />
                  </svg>
                  No patch yet. The suggested fix shows up here once a file fails.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const LOG_COLORS = {
  info: "#aab6c5",
  warn: "#f5a524",
  success: "#3ecf8e",
  error: "#ef5b5b",
};

function PanelHeader({ title, right }) {
  return (
    <div className="px-4 py-2.5 border-b border-[#252d38] flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-white">{title}</span>
      {right ? <span className="text-sm text-[#7f8da0] font-mono truncate">{right}</span> : null}
    </div>
  );
}

function LogoMark({ working, color }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors duration-500"
      style={{ borderColor: color + "88", background: color + "1a" }}
    >
      <svg
        className={working ? "aura-spin" : ""}
        width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="2" strokeLinecap="round"
      >
        <path d="M12 3a9 9 0 1 0 9 9" />
        <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
      </svg>
    </div>
  );
}

function StageIcon({ name, color }) {
  const props = {
    width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (name === "alert")
    return (
      <svg {...props}>
        <path d="M12 3l10 18H2L12 3z" />
        <path d="M12 10v5M12 18h.01" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.5-4.5" />
      </svg>
    );
  return (
    <svg {...props}>
      <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" />
    </svg>
  );
}

function StageCard({ stage, number, activeStep }) {
  const done = activeStep > number || (number === 3 && activeStep === 3);
  const current = activeStep === number && !done;
  const lit = done || current;

  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-[#141a22] p-4 transition-all duration-500"
      style={{
        borderColor: lit ? stage.color + "99" : "#252d38",
        background: lit ? stage.color + "12" : "#141a22",
        opacity: lit || activeStep === 0 ? 1 : 0.55,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-500"
          style={{ background: lit ? stage.color + "26" : "#1c2530" }}
        >
          <StageIcon name={stage.icon} color={lit ? stage.color : "#6b7a8c"} />
        </div>

        {done ? (
          <span
            className="aura-pop w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: stage.color }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0e1319" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
        ) : current ? (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: stage.color }}>
            <span className="relative flex w-2 h-2">
              <span className="aura-ring absolute inset-0 rounded-full" style={{ background: stage.color }} />
              <span className="relative w-2 h-2 rounded-full" style={{ background: stage.color }} />
            </span>
            Running
          </span>
        ) : (
          <span className="text-xs text-[#5d6b7d]">Step {number}</span>
        )}
      </div>

      <h3 className="mt-3 text-base font-semibold" style={{ color: lit ? "#fff" : "#9aa7b8" }}>
        {stage.title}
      </h3>
      <p className="text-sm text-[#7f8da0] mt-0.5">{stage.desc}</p>

      {current && (
        <div className="absolute left-0 bottom-0 h-0.5 w-full" style={{ background: stage.color + "33" }}>
          <div className="aura-sweep h-full w-1/3" style={{ background: stage.color }} />
        </div>
      )}
    </div>
  );
}

function DiffView({ code }) {
  const lines = code.split("\n");
  return (
    <pre className="font-mono text-[13px] leading-6 py-3 m-0">
      {lines.map((line, i) => {
        let color = "#aab6c5";
        let bg = "transparent";
        let bar = "transparent";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          color = "#7fe3b0"; bg = "#3ecf8e1a"; bar = "#3ecf8e";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          color = "#f59a9a"; bg = "#ef5b5b1a"; bar = "#ef5b5b";
        } else if (line.startsWith("@@")) {
          color = "#4aa3ff";
        }
        return (
          <div
            key={i}
            className="aura-rise px-4 whitespace-pre-wrap break-words border-l-2"
            style={{
              color, background: bg, borderLeftColor: bar,
              animationDelay: Math.min(i * 25, 600) + "ms",
            }}
          >
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
