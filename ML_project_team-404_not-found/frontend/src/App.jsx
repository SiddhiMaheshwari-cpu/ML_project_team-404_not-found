import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState(["[AURA-OS] Core systems online. Listening for CI/CD failures..."]);
  const [patchCode, setPatchCode] = useState("");
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

    try {
      ws = new WebSocket("ws://127.0.0.1:8000/ws");

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === "success") {
            clearActiveTimeouts();
            setActiveStep(1);
            setLogs((prev) => [
              ...prev,
              `[WATCHER] 👁️ Failure intercepted in ${data.filename || "file"}...`
            ]);
            setPatchCode("");

            const t1 = setTimeout(() => {
              setActiveStep(2);
              setLogs((prev) => [
                ...prev,
                `[BRAIN] 🧠 Analyzing bugs and querying Gemini...`
              ]);

              const t2 = setTimeout(() => {
                setActiveStep(3);
                setPatchCode(data.patch || "");
                setLogs((prev) => [
                  ...prev,
                  `[BRAIN] ✨ AI patch synthesized & saved! Auto-healed ${data.filename || "file"}.`
                ]);
              }, 1500);
              timeouts.push(t2);
            }, 1000);
            timeouts.push(t1);
          } else {
            setLogs((prev) => [...prev, `[ERROR] ❌ ${data.message || "Operation failed"}`]);
          }
        } catch {
          setLogs((prev) => [...prev, `[ERROR] ❌ Failed to parse incoming WebSocket message`]);
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

  return (
    <div className="min-h-screen bg-[#0d0a15] text-gray-300 p-8 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]">
            ⚡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-widest">AURA</h1>
          <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400 border border-gray-700">
            AUTONOMOUS PIPELINE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected
                ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                : 'bg-red-500 shadow-[0_0_10px_#ef4444]'
            }`}
          />
          <span className="text-sm font-medium text-gray-400">
            {isConnected ? 'Monitoring Webhooks' : 'Disconnected'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#151121] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />
            <h2 className="text-xl font-bold text-white mb-2">Background Agent Active</h2>
            <p className="text-sm text-gray-400 mb-6">
              AURA is watching your file system. Save any Python file in the monitored directory to instantly trigger the self-healing AI pipeline.
            </p>
            <div className="bg-[#1a1528] rounded-lg p-4 flex items-center justify-center border border-gray-700">
              <span className="text-indigo-400 animate-pulse text-sm font-medium">
                {activeStep === 0 ? "↻ Waiting for file changes..." : "⚡ Healing in progress..."}
              </span>
            </div>
          </div>

          <div className="bg-[#151121] border border-gray-800 rounded-xl p-6">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-6 uppercase">Workflow Status</h3>
            <div className="flex flex-col gap-6">
              <StepItem number="1" title="Intercept" desc="Catch Failure" active={activeStep >= 1} />
              <StepItem number="2" title="Analyze" desc="AST Parsing" active={activeStep >= 2} />
              <StepItem number="3" title="Synthesize" desc="AI Generation" active={activeStep >= 3} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[#151121] border border-gray-800 rounded-xl h-64 flex flex-col">
            <div className="bg-[#1a1528] px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-800 rounded-t-xl flex items-center gap-2">
              <span>{">_"}</span> AURA KERNEL
            </div>
            <div className="p-4 font-mono text-sm overflow-y-auto flex-1">
              {logs.map((log, idx) => (
                <div
                  key={`${idx}-${log.slice(0, 15)}`}
                  className={`whitespace-pre-wrap mb-1 ${
                    log.includes('ERROR')
                      ? 'text-red-400'
                      : log.includes('✨')
                      ? 'text-emerald-400'
                      : 'text-gray-400'
                  }`}
                >
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          <div className="bg-[#151121] border border-gray-800 rounded-xl flex-1 min-h-[300px] flex flex-col">
            <div className="bg-[#1a1528] px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-800 rounded-t-xl flex items-center gap-2">
              <span>{"</>"}</span> RESOLVED PATCH (DIFF)
            </div>
            <div className="p-4 font-mono text-sm overflow-auto flex-1 bg-[#0d0a15] m-2 rounded-lg border border-gray-800">
              {patchCode ? (
                <pre className="text-emerald-400 whitespace-pre-wrap">{patchCode}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 italic">
                  Awaiting background file trigger...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepItem({ number, title, desc, active = false }) {
  return (
    <div className={`flex items-center gap-4 transition-all duration-300 ${active ? 'opacity-100' : 'opacity-40'}`}>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
          active
            ? 'border-purple-500 text-purple-400 bg-purple-500/10 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
            : 'border-gray-700 text-gray-500'
        }`}
      >
        {active ? '✓' : number}
      </div>
      <div>
        <h4 className={`font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}