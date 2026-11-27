import React from "react";
import { EDU_STEPS, STAGES } from "../constants";
import { ShieldIcon } from "./Icons";

// phase: 0 idle · 1 intercepting · 2 analyzing · 3 patch ready (awaiting approval) · 4 applied
function stepState(step, index, phase) {
  if (phase === 4) return "done";
  if (phase === 0) return "pending";
  if (step.stage === 1) return phase === 1 ? "active" : "done";
  if (step.stage === 2) return phase < 2 ? "pending" : phase === 2 ? "active" : "done";
  return phase === 3 ? "active" : "pending"; // stage 3 (apply)
}

export default function HowItWorks({ activeStep, approvalStatus }) {
  const phase = approvalStatus === "approved" ? 4 : activeStep;
  const states = EDU_STEPS.map((s, i) => stepState(s, i, phase));
  const doneCount = states.filter((s) => s === "done").length;
  const activeCount = states.filter((s) => s === "active").length;
  const progress = ((doneCount + (activeCount ? 0.5 : 0)) / EDU_STEPS.length) * 92;

  return (
    <section id="au-guide" className="au-panel d4">
      <div className="au-panel-head">
        <h2 className="au-panel-title"><ShieldIcon size={22} /> How AURA Works</h2>
        <span className="au-sub">Hover or focus a step to learn more</span>
      </div>

      <div className="au-edu">
        <p className="au-edu-intro">
          Every time a monitored file fails, AURA walks the same seven steps. The highlighted steps below follow the
          stage the backend is reporting right now, so you can watch the pipeline do its job.
        </p>

        <ol className="au-steps" style={{ listStyle: "none", margin: "18px 0 0", padding: 0, "--p": `${progress}%` }}>
          {EDU_STEPS.map((step, i) => {
            const state = states[i];
            const stage = STAGES[step.stage - 1];
            return (
              <li key={step.title} className={`au-step ${state}`} style={{ "--sc": stage.color }}>
                <div className="au-tip" tabIndex={0} data-tip={step.long} aria-label={`${step.title}. ${step.long}`}>
                  <div className="node">{state === "done" ? "✓" : i + 1}</div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.short}</p>
              </li>
            );
          })}
        </ol>

        <div className="au-edu-foot">
          <span>Steps 1–7 map onto the three pipeline stages above: <b style={{ color: "var(--au-dim)" }}>Intercept → Analyze (steps 2–6) → Synthesize</b>.</span>
          <span>The backend reports progress per stage, so steps 2–6 light up together.</span>
        </div>
      </div>
    </section>
  );
}
