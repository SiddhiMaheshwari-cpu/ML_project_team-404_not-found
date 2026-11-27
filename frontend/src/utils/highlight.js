// Tiny, dependency-free, line-based syntax highlighter. It is deliberately
// approximate (no multi-line state) but works across the languages AURA handles.
const KEYWORDS = new Set((
  "const let var function return if else elif for while do switch case break continue new class extends import export from default " +
  "async await try catch finally throw typeof instanceof in of def lambda pass raise with as yield None True False and or not is " +
  "null undefined true false this self public private protected static void int float double char string bool boolean long short " +
  "struct enum interface type package fn func go defer range using namespace include println print"
).split(" "));

const TOKEN_RE = /(\/\/.*|#.*|\/\*.*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;

export function highlightLine(text) {
  const out = [];
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), c: null });
    if (m[1]) out.push({ t: m[1], c: "cm" });
    else if (m[2]) out.push({ t: m[2], c: "st" });
    else if (m[3]) out.push({ t: m[3], c: "nu" });
    else if (m[4]) out.push({ t: m[4], c: KEYWORDS.has(m[4]) ? "kw" : "fn" });
    else if (m[5]) out.push({ t: m[5], c: KEYWORDS.has(m[5]) ? "kw" : null });
    last = m.index + m[0].length;
    if (m[0].length === 0) TOKEN_RE.lastIndex++;
  }
  if (last < text.length) out.push({ t: text.slice(last), c: null });
  return out;
}
