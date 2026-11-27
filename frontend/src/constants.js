// Backend endpoints (unchanged from the original dashboard).
export const WS_URL = "ws://127.0.0.1:8000/ws";
export const APPROVE_URL = "http://127.0.0.1:8000/api/approve-patch";

// The three pipeline stages the backend actually reports (activeStep 1..3).
export const STAGES = [
  {
    title: "Intercept",
    desc: "Catches the failed run",
    color: "#ffb020",
    icon: "alert",
    detail: "The watcher saw a saved file fail its local syntax check and forwarded it to the AURA brain.",
  },
  {
    title: "Analyze",
    desc: "Parses the code, asks Gemini",
    color: "#2f9dff",
    icon: "search",
    detail: "AST context around the error is extracted and sent with the file to the AI repair engine.",
  },
  {
    title: "Synthesize",
    desc: "Awaits approval & applies patch",
    color: "#19f5c8",
    icon: "code",
    detail: "A suggested patch is shown for review. Nothing is written to disk until you approve it.",
  },
];

// Educational walkthrough. `stage` ties each step to one of the three
// real stages above, because the backend only reports stage-level progress.
export const EDU_STEPS = [
  {
    title: "Detect failure",
    stage: 1,
    short: "A saved file fails its syntax check.",
    long: "The file watcher debounces your edits, then runs a local check (ast.parse for Python, node --check for JS/TS). Failures are forwarded to the backend.",
  },
  {
    title: "Parse with AST",
    stage: 2,
    short: "Code becomes a syntax tree.",
    long: "An abstract syntax tree lets AURA reason about structure (functions, blocks, statements) instead of treating your file as plain text.",
  },
  {
    title: "Locate the block",
    stage: 2,
    short: "Pinpoint the faulty function.",
    long: "The error line is mapped onto the tree to find the surrounding function or block, so only relevant context is sent onward.",
  },
  {
    title: "Send to AI engine",
    stage: 2,
    short: "Code + AST context go to Gemini.",
    long: "The file and the extracted AST context are packed into a prompt for the Gemini repair model.",
  },
  {
    title: "Generate patch",
    stage: 2,
    short: "The model proposes a fix.",
    long: "Gemini returns corrected code. If it replies that the file is already fine, no patch is produced.",
  },
  {
    title: "Validate patch",
    stage: 2,
    short: "Sanity-check before showing it.",
    long: "Python patches are re-parsed to confirm they are valid syntax, and no-op rewrites are filtered out. Other languages get the no-change check only.",
  },
  {
    title: "Apply after approval",
    stage: 3,
    short: "You decide. Nothing is auto-applied.",
    long: "Human-in-the-loop: the patch is written to your file only when you click Approve & Apply Fix.",
  },
];

export const LOG_COLORS = {
  info: "#9db4cc",
  warn: "#ffb020",
  success: "#19f5c8",
  error: "#ff4d6a",
};
