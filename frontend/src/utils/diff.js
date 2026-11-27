// Parses the unified diff the backend sends (difflib.unified_diff, lineterm="")
// into rows with line numbers, ready for rendering.
export function parseDiff(diffText) {
  const rows = [];
  let oldNo = 0;
  let newNo = 0;
  for (const line of (diffText || "").split("\n")) {
    if (line.startsWith("---") || line.startsWith("+++")) {
      rows.push({ type: "meta", text: line });
    } else if (line.startsWith("@@")) {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (m) {
        oldNo = parseInt(m[1], 10);
        newNo = parseInt(m[2], 10);
      }
      rows.push({ type: "hunk", text: line });
    } else if (line.startsWith("+")) {
      rows.push({ type: "add", text: line.slice(1), no: newNo++ });
    } else if (line.startsWith("-")) {
      rows.push({ type: "del", text: line.slice(1), no: oldNo++ });
    } else {
      rows.push({ type: "ctx", text: line.startsWith(" ") ? line.slice(1) : line, no: newNo++ });
      oldNo++;
    }
  }
  return rows;
}

// Plain file view (no diff markers).
export function parseCode(code) {
  return (code || "").split("\n").map((text, i) => ({ type: "ctx", text, no: i + 1 }));
}

// Fallback for patches that already contain +/- markers but no hunk headers.
export function parseMarked(code) {
  return (code || "").split("\n").map((line, i) => {
    if (line.startsWith("+") && !line.startsWith("+++")) return { type: "add", text: line.slice(1), no: i + 1 };
    if (line.startsWith("-") && !line.startsWith("---")) return { type: "del", text: line.slice(1), no: i + 1 };
    if (line.startsWith("@@")) return { type: "hunk", text: line };
    return { type: "ctx", text: line, no: i + 1 };
  });
}
