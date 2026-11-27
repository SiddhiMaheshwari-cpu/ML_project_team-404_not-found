import React from "react";

export default function StatusBanner({ headline, accent, isWorking, activeStep, approvalStatus, patchFile, patchLang }) {
  const idle = activeStep === 0 && approvalStatus === "idle";
  const body = idle
    ? "Save any code file (.py, .js, .cpp, .java, etc.) in the monitored folder. If it errors, AURA prepares a fix."
    : patchFile
    ? `Working on ${patchFile}${patchLang ? ` (${patchLang})` : ""}`
    : "";

  return (
    <section className="au-banner" style={{ "--au-accent": accent }} aria-live="polite">
      <div className="au-banner-bar" />
      <div style={{ minWidth: 0 }}>
        <h2>{headline}</h2>
        <p>{body}</p>
      </div>
      {isWorking && (
        <div className="au-sweep-track">
          <div className="aura-sweep" />
        </div>
      )}
    </section>
  );
}
