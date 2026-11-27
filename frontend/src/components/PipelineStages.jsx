import React from "react";
import { STAGES } from "../constants";
import { StageIcon, CheckIcon } from "./Icons";

function StageCard({ stage, number, activeStep, approvalStatus }) {
  // Same completion logic as the original dashboard...
  const done = activeStep > number || (number === 3 && activeStep === 3);
  const current = activeStep === number && !done;
  // ...except that the last stage is only "done" once the patch is applied;
  // while it waits for the human it shows an explicit "Awaiting you" state.
  const awaiting = number === 3 && activeStep === 3 && approvalStatus === "pending";
  const showDone = done && !awaiting;
  const lit = done || current;

  return (
    <div
      className={`au-stage ${lit ? "lit" : ""} ${!lit && activeStep !== 0 ? "dim" : ""}`}
      style={{ "--sc": stage.color }}
    >
      <div className="au-stage-top">
        <div className="au-stage-icon">
          <StageIcon name={stage.icon} size={22} style={{ color: lit ? stage.color : "#6b8299" }} />
        </div>

        {showDone ? (
          <span className="au-check" aria-label="Complete">
            <CheckIcon size={15} style={{ color: "#021915" }} />
          </span>
        ) : awaiting ? (
          <span className="au-stage-tag">
            <span className="au-dot live"><i /><i /></span>Awaiting you
          </span>
        ) : current ? (
          <span className="au-stage-tag">
            <span className="au-dot live"><i /><i /></span>Running
          </span>
        ) : (
          <span className="au-stage-tag idle">Step {number}</span>
        )}
      </div>

      <h3>{stage.title}</h3>
      <p>{stage.desc}</p>
      <small>{stage.detail}</small>

      {current && (
        <div className="au-stage-run">
          <div className="aura-sweep" />
        </div>
      )}
    </div>
  );
}

export default function PipelineStages({ activeStep, approvalStatus }) {
  return (
    <div className="au-stages" role="list" aria-label="Repair pipeline stages">
      {STAGES.map((stage, i) => (
        <StageCard key={stage.title} stage={stage} number={i + 1} activeStep={activeStep} approvalStatus={approvalStatus} />
      ))}
    </div>
  );
}
