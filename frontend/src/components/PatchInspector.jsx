import React, { useMemo, useState } from "react";
import { parseDiff, parseCode, parseMarked } from "../utils/diff";
import { highlightLine } from "../utils/highlight";
import { WrenchIcon, BracketsIcon, CopyIcon, CheckIcon, ShieldIcon } from "./Icons";

function Highlighted({ text }) {
  if (!text) return " ";
  return highlightLine(text).map((tok, i) =>
    tok.c ? (
      <span key={i} className={`au-tok-${tok.c}`}>{tok.t}</span>
    ) : (
      <React.Fragment key={i}>{tok.t}</React.Fragment>
    )
  );
}

function CodeRows({ rows }) {
  return (
    <pre>
      {rows.map((r, i) => {
        const marker = r.type === "add" ? "+" : r.type === "del" ? "−" : "";
        return (
          <div
            key={i}
            className={`au-row ${r.type}`}
            style={{ animationDelay: Math.min(i * 22, 600) + "ms" }}
          >
            <span className="no">{r.no ?? ""}</span>
            <span className="mk">{marker}</span>
            <span className="tx">
              {r.type === "hunk" || r.type === "meta" ? r.text : <Highlighted text={r.text} />}
            </span>
          </div>
        );
      })}
    </pre>
  );
}

function statusBadge({ isWorking, approvalStatus, hadError, patchFile }) {
  if (approvalStatus === "approved") return { cls: "teal", text: "HEALED & APPLIED" };
  if (approvalStatus === "applying") return { cls: "blue", text: "APPLYING…" };
  if (approvalStatus === "pending") return { cls: "amber", text: "AWAITING APPROVAL" };
  if (approvalStatus === "rejected") return { cls: "red", text: "REJECTED" };
  if (isWorking) return { cls: "blue", text: "ANALYZING" };
  if (hadError) return { cls: "red", text: "ERROR" };
  if (patchFile) return { cls: "grey", text: "NO PATCH NEEDED" };
  return { cls: "grey", text: "IDLE" };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PatchInspector({
  patchCode, patchDiff, patchFile, patchLang, approvalStatus, isWorking, hadError, resultNote,
  onApprove, onReject, onCopied,
}) {
  const [view, setView] = useState("diff");
  const [copied, setCopied] = useState(false);

  const hasDiff = Boolean(patchDiff);
  const activeView = hasDiff ? view : "file";

  const rows = useMemo(() => {
    if (!patchCode) return [];
    if (activeView === "diff") return parseDiff(patchDiff);
    // No backend diff available: fall back to the original behaviour (markers inside the patch text).
    return hasDiff ? parseCode(patchCode) : parseMarked(patchCode);
  }, [patchCode, patchDiff, activeView, hasDiff]);

  const counts = useMemo(() => {
    const src = hasDiff ? parseDiff(patchDiff) : [];
    return { add: src.filter((r) => r.type === "add").length, del: src.filter((r) => r.type === "del").length };
  }, [patchDiff, hasDiff]);

  const badge = statusBadge({ isWorking, approvalStatus, hadError, patchFile });
  const pending = approvalStatus === "pending";
  const applying = approvalStatus === "applying";
  const live = pending || isWorking;

  const handleCopy = async () => {
    const text = activeView === "diff" ? patchDiff : patchCode;
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      onCopied?.(activeView === "diff" ? "diff" : "patched file");
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <section
      id="au-inspector"
      className={`au-panel au-insp d1 ${live ? "au-live" : ""}`}
      style={{ "--au-edge": pending ? "#ffb020" : "#2f9dff" }}
    >
      <div className="au-panel-head">
        <h2 className="au-panel-title"><WrenchIcon size={22} /> Patch Inspector</h2>
        <span className="au-sub">Review before anything touches disk</span>
      </div>

      <div className="au-file">
        <div className="au-filename">
          {patchFile || "No file yet"}
          {patchFile && patchLang ? <em> ({patchLang})</em> : null}
        </div>
        <span className={`au-badge ${badge.cls}`} role="status">{badge.text}</span>
      </div>

      {patchCode ? (
        <div className="au-viewbar">
          {hasDiff ? (
            <div className="au-seg" role="group" aria-label="Patch view">
              <button type="button" aria-pressed={activeView === "diff"} onClick={() => setView("diff")}>Diff</button>
              <button type="button" aria-pressed={activeView === "file"} onClick={() => setView("file")}>Patched file</button>
            </div>
          ) : <span />}
          {hasDiff && (
            <span className="au-stats-inline">
              <span className="a">+{counts.add}</span> <span className="d">−{counts.del}</span> lines
            </span>
          )}
        </div>
      ) : null}

      <div className="au-code" tabIndex={0} aria-label="Patch preview">
        {patchCode ? (
          <CodeRows rows={rows} />
        ) : isWorking ? (
          <div className="au-empty">
            <div className="au-spinner" />
            <div>Analyzing {patchFile || "file"} and asking the AI repair engine for a fix…</div>
          </div>
        ) : (
          <div className="au-empty">
            <BracketsIcon size={40} strokeWidth={1.5} />
            <div>{resultNote || "No patch yet. The suggested fix shows up here once a file fails."}</div>
          </div>
        )}
      </div>

      {patchCode ? (
        <div className="au-actions">
          <button type="button" className="au-btn danger" onClick={onReject} disabled={!pending}>
            Reject
          </button>
          <button type="button" className="au-btn" onClick={handleCopy}>
            {copied ? <><CheckIcon size={18} /> Copied</> : <><CopyIcon size={18} /> Copy Patch</>}
          </button>
          <button type="button" className="au-btn primary" onClick={onApprove} disabled={!pending}>
            {applying ? (<><span className="au-mini-spin" /> Applying…</>)
              : approvalStatus === "approved" ? (<><CheckIcon size={18} /> Applied to file</>)
              : "Approve & Apply Fix"}
          </button>
        </div>
      ) : null}

      <div className="au-hitl">
        <span className="au-chip au-tip" tabIndex={0} data-tip="AURA never edits your file on its own. Only the Approve button writes the patch to disk.">
          <ShieldIcon size={15} /> HUMAN-IN-THE-LOOP ACTIVE
        </span>
      </div>
    </section>
  );
}
