import React, { useState, useEffect } from "react";
import "./aura.css";
import { WS_URL, APPROVE_URL, STAGES } from "./constants";
import AmbientBackground from "./components/AmbientBackground";
import Header from "./components/Header";
import StatusBanner from "./components/StatusBanner";
import PipelineStages from "./components/PipelineStages";
import PatchInspector from "./components/PatchInspector";
import DiagnosticsPanel from "./components/DiagnosticsPanel";
import ActivityLog from "./components/ActivityLog";
import HowItWorks from "./components/HowItWorks";

function now() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function makeLog(level, text, tag) {
  return { time: now(), level, text, tag };
}

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([
    makeLog("info", "AURA started. Waiting for failures in the monitored directory.", "BOOT"),
  ]);
  const [patchCode, setPatchCode] = useState("");
  const [patchDiff, setPatchDiff] = useState("");
  const [patchFile, setPatchFile] = useState("");
  const [patchFilePath, setPatchFilePath] = useState("");
  const [patchLang, setPatchLang] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("idle"); // idle | pending | applying | approved | rejected
  const [activeStep, setActiveStep] = useState(0);

  // Real data the backend already sends (previously unused by the UI)
  const [engineModel, setEngineModel] = useState("");
  const [mlConfidence, setMlConfidence] = useState(null);
  const [mlComplexity, setMlComplexity] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [resultNote, setResultNote] = useState("");
  const [hadError, setHadError] = useState(false);
  const [stats, setStats] = useState({ scans: 0, patches: 0, applied: 0 });

  const addLog = (level, text, tag) => setLogs((prev) => [...prev, makeLog(level, text, tag)]);

  useEffect(() => {
    if (typeof WebSocket === "undefined") return;

    let ws = null;
    const timeouts = [];

    const clearActiveTimeouts = () => {
      while (timeouts.length > 0) {
        clearTimeout(timeouts.pop());
      }
    };

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // The initial history snapshot is not replayed into the log, but it
          // tells us which Gemini model the backend is running.
          if (data.status === "snapshot") {
            if (data.model) setEngineModel(data.model);
            return;
          }

          const name = data.filename || "file";
          const lang = data.language || "code";

          if (data.status === "analyzing") {
            clearActiveTimeouts();
            setActiveStep(1);
            setPatchFile(name);
            setPatchFilePath(data.filepath || "");
            setPatchLang(lang);
            setApprovalStatus("idle");
            // A new run starts: drop the previous run's patch so it is never shown under the wrong file.
            setPatchCode("");
            setPatchDiff("");
            setResultNote("");
            setHadError(false);
            setStats((s) => ({ ...s, scans: s.scans + 1 }));
            addLog("warn", `Failure caught in ${name} (${lang}).`, "INTERCEPTED");

            const t1 = setTimeout(() => {
              setActiveStep(2);
              addLog("info", `Analyzing ${lang} error and asking Gemini for a fix...`, "ANALYZING");
            }, 400);
            timeouts.push(t1);
          } else if (data.status === "success") {
            clearActiveTimeouts();
            setPatchFile(name);
            setPatchFilePath(data.filepath || "");
            setPatchLang(lang);
            if (data.ml_confidence != null) setMlConfidence(data.ml_confidence);
            if (data.ml_complexity != null) setMlComplexity(data.ml_complexity);
            if (data.duration != null) setLastRun({ id: data.id, duration: data.duration });

            if (data.changed && data.patch) {
              setActiveStep(3);
              setPatchCode(data.patch);
              setPatchDiff(data.diff || "");
              setApprovalStatus("pending");
              setStats((s) => ({ ...s, patches: s.patches + 1 }));
              addLog("warn", `Patch ready for ${name}. Waiting for human approval.`, "AWAITING APPROVAL");
            } else {
              setActiveStep(0);
              setApprovalStatus("idle");
              setResultNote(`${name}: ${data.message || "No issues found."}`);
              addLog("info", `${name}: ${data.message || "No issues found."}`, "NO PATCH");
            }
          } else if (data.status === "error") {
            setActiveStep(0);
            setHadError(true);
            setResultNote(data.message || "Operation failed.");
            addLog("error", data.message || "Operation failed.", "ERROR");
          }
        } catch {
          addLog("error", "Could not read the message from the server.", "ERROR");
        }
      };

      ws.onerror = () => setIsConnected(false);
      ws.onclose = () => setIsConnected(false);
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

  const handleApprove = async () => {
    if (!patchFilePath || !patchCode) return;
    setApprovalStatus("applying");
    try {
      const res = await fetch(APPROVE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: patchFilePath,
          patched_code: patchCode,
        }),
      });
      const result = await res.json();
      if (result.status === "success") {
        setApprovalStatus("approved");
        setStats((s) => ({ ...s, applied: s.applied + 1 }));
        addLog("success", `Approved & applied fix to ${patchFile}!`, "HEALED & APPLIED");
      } else {
        setApprovalStatus("pending");
        addLog("error", `Failed to apply patch: ${result.message}`, "APPLY FAILED");
      }
    } catch {
      setApprovalStatus("pending");
      addLog("error", "Could not reach backend to apply patch.", "APPLY FAILED");
    }
  };

  const handleReject = () => {
    setApprovalStatus("rejected");
    setActiveStep(0);
    addLog("info", `Patch rejected for ${patchFile}. File left untouched.`, "REJECTED");
  };

  const isWorking = activeStep > 0 && activeStep < 3;
  const headline = !isConnected
    ? "Backend not reachable"
    : isWorking
    ? "Analyzing & generating fix"
    : approvalStatus === "pending"
    ? "Approval required"
    : approvalStatus === "approved"
    ? "Fix approved & applied"
    : "Waiting for a failure";

  const accent = !isConnected
    ? "#ff4d6a"
    : approvalStatus === "pending"
    ? "#ffb020"
    : activeStep === 0
    ? "#19f0ff"
    : STAGES[Math.min(activeStep, 3) - 1].color;

  return (
    <div className="au-root">
      <AmbientBackground isConnected={isConnected} scans={stats.scans} />

      <div className="au-shell">
        <Header
          isConnected={isConnected}
          isWorking={isWorking}
          awaitingApproval={approvalStatus === "pending"}
          accent={accent}
          engineModel={engineModel}
        />

        <StatusBanner
          headline={headline}
          accent={accent}
          isWorking={isWorking}
          activeStep={activeStep}
          approvalStatus={approvalStatus}
          patchFile={patchFile}
          patchLang={patchLang}
        />

        <PipelineStages activeStep={activeStep} approvalStatus={approvalStatus} />

        <div className="au-main">
          <PatchInspector
            patchCode={patchCode}
            patchDiff={patchDiff}
            patchFile={patchFile}
            patchLang={patchLang}
            approvalStatus={approvalStatus}
            isWorking={isWorking}
            hadError={hadError}
            resultNote={resultNote}
            onApprove={handleApprove}
            onReject={handleReject}
            onCopied={(what) => addLog("info", `Copied ${what} for ${patchFile} to clipboard.`, "COPIED")}
          />

          <div className="au-col">
            <DiagnosticsPanel
              mlConfidence={mlConfidence}
              mlComplexity={mlComplexity}
              stats={stats}
              lastRun={lastRun}
            />
            <ActivityLog logs={logs} />
          </div>
        </div>

        <HowItWorks activeStep={activeStep} approvalStatus={approvalStatus} />

        <footer className="au-foot">
          <span>AURA-OS <b>//</b> Multi-language AST + ML pipeline</span>
          <span>{lastRun?.id ? <>Last run ID: <b>{lastRun.id}</b></> : "No runs yet"}</span>
        </footer>
      </div>
    </div>
  );
}
