/* ============================================================
   地獄のデジタル時計 — 初期設定

   ローカルファイルとして OBS に入れるときは、この CONFIG を編集します。
   URL にクエリがあるときは、クエリがここより優先されます。

   theme    blaze | abyss | guren | brand
   hours    12 | 24
   seconds  true で秒を表示 / false で隠す
   date     true で日付と曜日 / false で隠す
   motion   true で時計全体がゆっくり浮く。既定は false
   accent   "" または "#ff5a1f"。空ならテーマの色
   offset   null ならこの PC のローカル時刻。数値は UTC からの時間（日本は 9）

   クエリの例:
   ?theme=abyss&hours=24&seconds=1&date=1&motion=0&accent=ffb25a&offset=9
   ============================================================ */
const CONFIG = {
  theme: "blaze",
  hours: 24,
  seconds: true,
  date: true,
  motion: false,
  accent: "",
  offset: null,
};

/* ここから下は、通常はいじらなくて大丈夫です。 */

const THEME_IDS = ["blaze", "abyss", "guren", "brand"];
const THEME_ACCENTS = {
  blaze: "#ff5a1f",
  abyss: "#e7d2c8",
  guren: "#ff4d6d",
  brand: "#ff2a2a",
};
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const clock = document.getElementById("clock");
const periodEl = document.getElementById("period");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const spokenEl = document.getElementById("spoken");
const canvas = document.getElementById("embers");
const ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;
const rollTimers = new Map();
const motes = [];

let state = normalize(readQuery(location.search), CONFIG);
let lastDateKey = "";
let lastSpokenKey = "";
let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function readQuery(search) {
  const params = new URLSearchParams(search);
  const input = {};
  if (params.has("theme")) input.theme = params.get("theme");
  if (params.has("hours")) input.hours = params.get("hours");
  if (params.has("seconds")) input.seconds = params.get("seconds");
  if (params.has("date")) input.date = params.get("date");
  if (params.has("motion")) input.motion = params.get("motion");
  if (params.has("accent")) input.accent = params.get("accent");
  if (params.has("offset")) input.offset = params.get("offset");
  return input;
}

function themeFrom(value, fallback) {
  const name = String(value || "").toLowerCase();
  if (THEME_IDS.indexOf(name) !== -1) return name;
  if (THEME_IDS.indexOf(fallback) !== -1) return fallback;
  return "blaze";
}

function hoursFrom(value, fallback) {
  const hours = Number(value);
  if (hours === 12 || hours === 24) return hours;
  return fallback === 12 ? 12 : 24;
}

function boolFrom(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return fallback;
  const text = String(value).toLowerCase();
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return fallback;
}

function accentFrom(value) {
  if (value == null || String(value).trim() === "") return "";
  let hex = String(value).trim();
  if (hex.charAt(0) === "#") hex = hex.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split("")
      .map(function (char) {
        return char + char;
      })
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "";
  return "#" + hex.toLowerCase();
}

function offsetFrom(value, fallback) {
  if (value === undefined) return fallback;
  if (value === null || value === "") return null;
  const offset = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(offset) || offset < -12 || offset > 14) return fallback;
  return Math.round(offset * 100) / 100;
}

function normalize(input, fallback) {
  return {
    theme: themeFrom(input.theme, fallback.theme),
    hours: hoursFrom(input.hours, fallback.hours),
    seconds: boolFrom(input.seconds, fallback.seconds),
    date: boolFrom(input.date, fallback.date),
    motion: boolFrom(input.motion, fallback.motion),
    accent: Object.prototype.hasOwnProperty.call(input, "accent")
      ? accentFrom(input.accent)
      : fallback.accent || "",
    offset: offsetFrom(input.offset, fallback.offset),
  };
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function clockDate(offset) {
  const now = new Date();
  if (offset === null || offset === undefined || Number.isNaN(offset)) return now;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + offset * 60 * 60 * 1000);
}

function partsOf(date, current) {
  let hours = date.getHours();
  let period = "";
  if (current.hours === 12) {
    period = hours < 12 ? "午前" : "午後";
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }
  const hh = String(hours).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return {
    period: period,
    core: current.seconds ? hh + ":" + mm + ":" + ss : hh + ":" + mm,
  };
}

function face(char) {
  const node = document.createElement("span");
  node.className = "digit-face";
  node.textContent = char;
  return node;
}

function createDigit(char) {
  const digit = document.createElement("span");
  digit.className = "digit";
  digit.dataset.value = char;
  const windowEl = document.createElement("span");
  windowEl.className = "digit-window";
  const strip = document.createElement("span");
  strip.className = "digit-strip";
  strip.appendChild(face(char));
  windowEl.appendChild(strip);
  digit.appendChild(windowEl);
  return digit;
}

function createColon() {
  const colon = document.createElement("span");
  colon.className = "colon";
  colon.dataset.kind = "colon";
  colon.textContent = ":";
  return colon;
}

function settleDigit(digit, strip, char) {
  const timer = rollTimers.get(digit);
  if (timer) {
    clearTimeout(timer);
    rollTimers.delete(digit);
  }
  strip.replaceChildren(face(char));
  strip.style.transition = "none";
  strip.style.transform = "translateY(0)";
  strip.classList.remove("is-rolling");
}

function setDigit(digit, next, animate) {
  const prev = digit.dataset.value || next;
  if (prev === next && digit.querySelector(".digit-face")) return;
  digit.dataset.value = next;
  const strip = digit.querySelector(".digit-strip");
  if (!strip) return;
  if (!animate || prev === next) {
    settleDigit(digit, strip, next);
    return;
  }

  const pending = rollTimers.get(digit);
  if (pending) clearTimeout(pending);

  strip.replaceChildren(face(prev), face(next));
  strip.style.transition = "none";
  strip.style.transform = "translateY(0)";
  strip.classList.remove("is-rolling");
  void strip.offsetWidth;
  strip.style.transition = "";
  strip.classList.add("is-rolling");
  strip.style.transform = "translateY(-50%)";

  let settled = false;
  const done = function (event) {
    if (settled) return;
    if (event && event.propertyName && event.propertyName !== "transform") return;
    settled = true;
    strip.removeEventListener("transitionend", done);
    settleDigit(digit, strip, next);
  };
  strip.addEventListener("transitionend", done);
  rollTimers.set(
    digit,
    setTimeout(function () {
      done(null);
    }, 800),
  );
}

function syncTime(text, animate) {
  const chars = text.split("");
  const sameShape =
    timeEl.childElementCount === chars.length &&
    chars.every(function (char, index) {
      const child = timeEl.children[index];
      if (char === ":") return child.dataset.kind === "colon";
      return child.classList.contains("digit");
    });

  if (!sameShape) {
    const fragment = document.createDocumentFragment();
    chars.forEach(function (char) {
      fragment.appendChild(char === ":" ? createColon() : createDigit(char));
    });
    timeEl.replaceChildren(fragment);
    return;
  }

  chars.forEach(function (char, index) {
    if (char === ":") return;
    setDigit(timeEl.children[index], char, animate);
  });
}

function paintDate(date) {
  const weekday = WEEKDAYS[date.getDay()];
  const mark = document.createElement("span");
  mark.className = "weekday";
  mark.textContent = weekday;
  dateEl.replaceChildren(
    document.createTextNode(
      date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日（",
    ),
    mark,
    document.createTextNode("）"),
  );
}

function spokenLabel(date, current, parts) {
  const weekday = WEEKDAYS[date.getDay()];
  let hours = date.getHours();
  let prefix = "";
  if (current.hours === 12) {
    prefix = parts.period;
    hours = hours % 12 || 12;
  }
  const timeText = prefix + hours + "時" + date.getMinutes() + "分";
  if (!current.date) return timeText;
  return (
    date.getFullYear() +
    "年" +
    (date.getMonth() + 1) +
    "月" +
    date.getDate() +
    "日 " +
    weekday +
    "曜日 " +
    timeText
  );
}

function render(animate) {
  const date = clockDate(state.offset);
  const accent = state.accent || THEME_ACCENTS[state.theme];
  const rgb = hexToRgb(accent);
  const classNames = ["clock", "theme-" + state.theme];
  if (state.date) classNames.push("has-date");
  if (state.hours === 12) classNames.push("has-period");
  if (state.motion) classNames.push("is-motion");
  clock.className = classNames.join(" ");
  clock.style.setProperty("--accent", accent);
  clock.style.setProperty("--accent-rgb", rgb.r + ", " + rgb.g + ", " + rgb.b);
  clock.style.setProperty(
    "--deep",
    Math.round(rgb.r * 0.38) + ", " + Math.round(rgb.g * 0.22) + ", " + Math.round(rgb.b * 0.16),
  );

  const parts = partsOf(date, state);
  periodEl.hidden = state.hours !== 12;
  if (state.hours === 12 && periodEl.textContent !== parts.period) {
    periodEl.textContent = parts.period;
  }

  dateEl.hidden = !state.date;
  if (state.date) {
    const dateKey = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      paintDate(date);
    }
  }

  syncTime(parts.core, animate && !reduceMotion);

  const spokenKey = [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    state.hours,
    state.date ? "1" : "0",
  ].join("-");
  if (spokenKey !== lastSpokenKey) {
    lastSpokenKey = spokenKey;
    spokenEl.textContent = spokenLabel(date, state, parts);
  }
}

function tick() {
  render(true);
  schedule();
}

function schedule() {
  const delay = 1000 - (Date.now() % 1000) + 30;
  window.setTimeout(tick, delay);
}

function moteBudget() {
  if (!ctx || reduceMotion) return 0;
  if (state.theme === "brand") return 0;
  if (state.theme === "abyss") return 12;
  if (state.theme === "guren") return 18;
  return 30;
}

function resizeEmbers() {
  if (!ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawnMote(width, height) {
  const accent = state.accent || THEME_ACCENTS[state.theme];
  const rgb = hexToRgb(accent);
  const edge = Math.random() < 0.62;
  const x = edge
    ? Math.random() < 0.5
      ? Math.random() * width * 0.3
      : width * 0.7 + Math.random() * width * 0.3
    : width * 0.2 + Math.random() * width * 0.6;
  motes.push({
    x: x,
    y: height * (0.62 + Math.random() * 0.36),
    vx: (Math.random() - 0.5) * 0.2,
    vy: -0.15 - Math.random() * 0.38,
    rad: 0.7 + Math.random() * 1.4,
    life: 1,
    decay: 0.0022 + Math.random() * 0.0035,
    hot: Math.random() > 0.78,
    rgb: rgb,
    wobble: Math.random() * Math.PI * 2,
  });
}

function drawEmbers() {
  if (!ctx) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  const budget = moteBudget();
  while (motes.length > budget) motes.pop();
  if (motes.length < budget && width > 0) spawnMote(width, height);
  for (let i = motes.length - 1; i >= 0; i--) {
    const mote = motes[i];
    mote.wobble += 0.04;
    mote.x += mote.vx + Math.sin(mote.wobble) * 0.08;
    mote.y += mote.vy;
    mote.life -= mote.decay;
    if (mote.life <= 0 || mote.y < height * 0.12) {
      motes.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(mote.life, 0) * (mote.hot ? 0.9 : 0.5);
    ctx.fillStyle = mote.hot
      ? "#fff1c4"
      : "rgb(" + mote.rgb.r + "," + mote.rgb.g + "," + mote.rgb.b + ")";
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function emberLoop() {
  window.requestAnimationFrame(emberLoop);
  if (document.hidden) return;
  drawEmbers();
}

window.addEventListener("message", function (event) {
  if (event.origin !== location.origin) return;
  const data = event.data;
  if (!data || data.type !== "hell-clock") return;
  state = normalize(
    {
      theme: data.theme,
      hours: data.hours,
      seconds: data.seconds,
      date: data.date,
      motion: data.motion,
      accent: data.accent,
      offset: data.offset,
    },
    state,
  );
  render(false);
});

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const onMotionChange = function () {
  reduceMotion = motionQuery.matches;
  render(false);
};
if (typeof motionQuery.addEventListener === "function") {
  motionQuery.addEventListener("change", onMotionChange);
} else if (typeof motionQuery.addListener === "function") {
  motionQuery.addListener(onMotionChange);
}

window.addEventListener("resize", resizeEmbers);
resizeEmbers();
render(false);
schedule();
emberLoop();
