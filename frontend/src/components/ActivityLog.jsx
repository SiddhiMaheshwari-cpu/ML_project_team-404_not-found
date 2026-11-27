import React, { useEffect, useRef } from "react";
import { LOG_COLORS } from "../constants";
import { ActivityIcon } from "./Icons";

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

export default function ActivityLog({ logs }) {
  const scrollerRef = useRef(null);

  // Scroll only the log box (not the whole page) when new entries arrive.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [logs]);

  return (
    <section id="au-activity" className="au-panel d3">
      <div className="au-panel-head">
        <h2 className="au-panel-title"><ActivityIcon size={22} /> Live Activity Log</h2>
        <span className="au-sub">{logs.length} events</span>
      </div>

      <div className="au-log" ref={scrollerRef} role="log" aria-live="polite">
        {logs.map((log, idx) => (
          <div key={idx} className="au-entry" style={{ "--lc": LOG_COLORS[log.level] || LOG_COLORS.info }}>
            <span className={`dot ${log.level === "warn" && log.tag ? "pulse" : ""}`} />
            <span className="time">{log.time}</span>
            {log.tag ? <span className="tag">{log.tag}</span> : null}
            <span className="msg">{log.text}</span>
          </div>
        ))}
        <div className="au-cursor">
          <span className="time">{nowLabel()}</span>
          <span className="blk" />
        </div>
      </div>
    </section>
  );
}
