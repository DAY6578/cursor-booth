/* ============================================================
   キッチンタイマー時計 — 初期設定

   ローカルファイルとして OBS に入れるときは、この CONFIG を編集します。
   URL にクエリがあるときは、クエリがここより優先されます。

   theme    sepaku | hakka | shurei | kurumi
            白 / 緑 / 赤 / 木
   hours    12 | 24
   seconds  true で秒を表示 / false で隠す
   date     true で日付と曜日 / false で隠す
   accent   "" または "#243036"。空ならテーマの液晶色
   offset   null ならこの PC のローカル時刻。数値は UTC からの時間（日本は 9）

   クエリの例:
   ?theme=shurei&hours=24&seconds=1&date=1&accent=6e221c&offset=9
   ============================================================ */
const CONFIG = {
  theme: "sepaku",
  hours: 24,
  seconds: true,
  date: true,
  accent: "",
  offset: null,
};

/* ここから下は、通常はいじらなくて大丈夫です。 */

const THEME_IDS = ["sepaku", "hakka", "shurei", "kurumi"];
const THEME_ACCENTS = {
  sepaku: "#243036",
  hakka: "#1c4a38",
  shurei: "#6e221c",
  kurumi: "#ffb35c",
};
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const SEGMENTS = {
  0: "abcdef",
  1: "bc",
  2: "abdeg",
  3: "abcdg",
  4: "bcfg",
  5: "acdfg",
  6: "acdefg",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};

const clock = document.getElementById("clock");
const periodEl = document.getElementById("period");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const spokenEl = document.getElementById("spoken");

let state = normalize(readQuery(location.search), CONFIG);
let lastDateKey = "";
let lastSpokenKey = "";

function readQuery(search) {
  const params = new URLSearchParams(search);
  const input = {};
  if (params.has("theme")) input.theme = params.get("theme");
  if (params.has("hours")) input.hours = params.get("hours");
  if (params.has("seconds")) input.seconds = params.get("seconds");
  if (params.has("date")) input.date = params.get("date");
  if (params.has("accent")) input.accent = params.get("accent");
  if (params.has("offset")) input.offset = params.get("offset");
  return input;
}

function themeFrom(value, fallback) {
  const name = String(value || "").toLowerCase();
  if (THEME_IDS.indexOf(name) !== -1) return name;
  if (THEME_IDS.indexOf(fallback) !== -1) return fallback;
  return "sepaku";
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

function paintDigit(digit, char) {
  const on = SEGMENTS[char] || "";
  "abcdefg".split("").forEach(function (name) {
    digit.classList.toggle("on-" + name, on.indexOf(name) !== -1);
  });
  digit.dataset.value = char;
}

function createDigit(char) {
  const digit = document.createElement("span");
  digit.className = "digit";
  "abcdefg".split("").forEach(function (name) {
    const seg = document.createElement("span");
    seg.className = "seg seg-" + name;
    digit.appendChild(seg);
  });
  paintDigit(digit, char);
  return digit;
}

function createColon() {
  const colon = document.createElement("span");
  colon.className = "colon";
  colon.dataset.kind = "colon";
  const upper = document.createElement("i");
  const lower = document.createElement("i");
  colon.appendChild(upper);
  colon.appendChild(lower);
  return colon;
}

function syncTime(text) {
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
    const digit = timeEl.children[index];
    if (digit.dataset.value !== char) paintDigit(digit, char);
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

function render() {
  const date = clockDate(state.offset);
  const accent = state.accent || THEME_ACCENTS[state.theme];
  const rgb = hexToRgb(accent);
  const classNames = ["clock", "theme-" + state.theme];
  if (state.date) classNames.push("has-date");
  if (state.hours === 12) classNames.push("has-period");
  if (state.seconds) classNames.push("has-seconds");
  clock.className = classNames.join(" ");
  clock.style.setProperty("--ink", accent);
  clock.style.setProperty("--ink-rgb", rgb.r + ", " + rgb.g + ", " + rgb.b);

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

  syncTime(parts.core);

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
  render();
  schedule();
}

function schedule() {
  const delay = 1000 - (Date.now() % 1000) + 30;
  window.setTimeout(tick, delay);
}

window.addEventListener("message", function (event) {
  if (event.origin !== location.origin) return;
  const data = event.data;
  if (!data || data.type !== "kitchen-timer-clock") return;
  state = normalize(
    {
      theme: data.theme,
      hours: data.hours,
      seconds: data.seconds,
      date: data.date,
      accent: data.accent,
      offset: data.offset,
    },
    state,
  );
  render();
});

render();
schedule();
