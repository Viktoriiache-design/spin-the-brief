/* ==========================================================================
   Spin the Brief — логіка генерації, анти-повторів, барабанів і картки.
   Контент лежить у data/*.js (window.SPIN_DATA) і редагується окремо.
   ========================================================================== */
(() => {
  "use strict";

  const D = window.SPIN_DATA;
  const AUTHOR = { name: "Viktoriia Chernenko", ig: "@viktoriiache_", igUrl: "instagram.com/viktoriiache_" };
  const STORE_KEY = "spinTheBrief:v1";
  const HISTORY_MAX = 10;
  const PAIRS_MAX = 600;
  const RECENT_CATS = 3;
  const RECENT_PALETTES = 5;
  const WILDCARD_CHANCE = 0.1;
  const SPECIFIC_CONSTRAINT_CHANCE = 0.4;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Утиліти ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const rnd = (n) => Math.floor(Math.random() * n);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pick = (arr) => arr[rnd(arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- Збереження (localStorage з try/catch) ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (s && typeof s === "object") return s;
    } catch (_) { /* приватний режим / заблоковано */ }
    return {};
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (_) { /* ігноруємо */ }
  }

  const S = loadState();
  S.bags = S.bags && typeof S.bags === "object" ? S.bags : {};
  S.recentCats = Array.isArray(S.recentCats) ? S.recentCats : [];
  S.recentPalettes = Array.isArray(S.recentPalettes) ? S.recentPalettes : [];
  S.pairs = Array.isArray(S.pairs) ? S.pairs : [];
  S.recentCurated = Array.isArray(S.recentCurated) ? S.recentCurated : [];
  delete S.bags.audience; // старий спільний пул аудиторій (до прив'язки до ніш)
  S.history = Array.isArray(S.history) ? S.history : [];
  S.locks = S.locks && typeof S.locks === "object" ? S.locks : {};
  S.settings = Object.assign({ prof: "web", level: "middle", exportSize: "1350" }, S.settings || {});

  /* ---------- Shuffle bag ----------
     Кожна база має свій «мішок» перемішаних індексів (Fisher–Yates).
     Значення видаються без повторів, поки мішок не спорожніє; новий мішок
     ніколи не починається з останнього виданого значення.
     filter — додаткова умова (категорія ніші, пара «ніша+формат» тощо).
     mode "soft"   — якщо в поточному мішку немає підхожого, повернути -1 (мішок перемішується, лише коли наполовину використаний);
     mode "strict" — шукати лише в залишку мішка й повернути -1, нічого не змінюючи. */
  function refill(bag) {
    bag.q = shuffle([...Array(bag.n).keys()]);
    if (bag.n > 1 && bag.q[0] === bag.last) {
      const j = 1 + rnd(bag.n - 1);
      [bag.q[0], bag.q[j]] = [bag.q[j], bag.q[0]];
    }
  }
  function getBag(key, n) {
    let bag = S.bags[key];
    if (!bag || bag.n !== n || !Array.isArray(bag.q) || bag.q.some((i) => typeof i !== "number" || i >= n)) {
      bag = S.bags[key] = { n, q: [], last: -1 };
    }
    return bag;
  }
  function draw(key, n, filter, mode) {
    const bag = getBag(key, n);
    const ok = (i) => (n < 2 || i !== bag.last) && (!filter || filter(i));
    for (let pass = 0; pass < 2; pass++) {
      if (!bag.q.length) refill(bag);
      const k = bag.q.findIndex(ok);
      if (k >= 0) {
        const i = bag.q.splice(k, 1)[0];
        bag.last = i;
        return i;
      }
      if (mode === "strict") return -1;
      if (mode === "soft") {
        // у залишку мішка нічого не підходить: якщо мішок уже наполовину використаний —
        // починаємо новий (недавні значення відсікає сам filter), інакше — промах
        if (pass === 0 && bag.q.length < n * 0.6) { bag.q = []; continue; }
        return -1;
      }
      bag.q = []; // у залишку нічого не підходить — починаємо новий мішок
    }
    refill(bag); // фолбек: фільтр нездійсненний, беремо будь-що без повтору останнього
    const i = bag.q.shift();
    bag.last = i;
    return i;
  }

  /* ---------- Пули даних ---------- */
  const CATS = Object.keys(D.nicheCategories || {});
  const NICHES = D.niches.map((n) => ({
    text: n.name,
    cat: n.category,
    emoji: (D.nicheCategories || {})[n.category] || "•",
    ci: Math.max(0, CATS.indexOf(n.category)),
    type: n.type || "B2C",
    tags: Array.isArray(n.tags) ? n.tags : [n.type === "B2B" ? "B2B" : "B2C"],
    audiences: Array.isArray(n.audiences) && n.audiences.length ? n.audiences : ["широка аудиторія"],
  }));
  const NICHE_INDEX = new Map(NICHES.map((n, i) => [n.text, i]));
  const ALL_AUDIENCES = NICHES.flatMap((n) => n.audiences);
  const TYPE_NAME = { B2C: "B2C", B2B: "B2B", both: "B2C + B2B" };
  const PROFS = D.professions;
  const PROF_BY_ID = Object.fromEntries(PROFS.map((p) => [p.id, p]));
  const ANY = { id: "any", name: "Будь-хто", emoji: "🎲" };
  // формати — об'єкти { name, requires?, requiresAll?, excludes? }; рядки теж приймаємо
  PROFS.forEach((p) => { p.formats = p.formats.map((f) => (typeof f === "string" ? { name: f } : f)); });
  const ALL_FORMATS = PROFS.flatMap((p) => p.formats.map((f) => f.name));
  const ALL_CONSTRAINTS = [
    ...D.constraints.technical, ...D.constraints.client,
    ...Object.values(D.constraints.byProfession).flatMap((v) => [...v.technical, ...v.client]),
  ];
  const LEVELS = {
    junior: { label: "Junior", hint: "1 технічне обмеження, без дедлайну" },
    middle: { label: "Middle", hint: "1 обмеження будь-якого типу + дедлайн" },
    senior: { label: "Senior", hint: "2 обмеження + жорсткий дедлайн" },
  };
  const TYPE_LABEL = { technical: "Технічне", client: "Клієнт каже" };
  const SCHEMES = [
    { id: "analogous", name: "аналогова", offsets: [0, -28, 28, -56, 56] },
    { id: "complementary", name: "комплементарна", offsets: [0, 180, 0, 180, 22] },
    { id: "triadic", name: "тріадна", offsets: [0, 120, 240, 0, 120] },
    { id: "split", name: "split-complementary", offsets: [0, 150, 210, 0, 150] },
    { id: "mono", name: "монохромна", offsets: [0, 0, 0, 0, 0] },
    { id: "tetradic", name: "тетрадна", offsets: [0, 90, 180, 270, 0] },
  ];

  const REELS = [
    { key: "format", label: "Формат" },
    { key: "niche", label: "Ніша" },
    { key: "audience", label: "Аудиторія" },
    { key: "mood", label: "Настрій" },
    { key: "constraint", label: "Обмеження" },
  ];

  /* ---------- Кольори ---------- */
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  }
  function hexToHsl(hex) {
    let [r, g, b] = hexToRgb(hex).map((x) => x / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }
  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  function hueIn(h, range) {
    if (range === "any") return true;
    const [a, b] = range;
    return a <= b ? h >= a && h <= b : h >= a || h <= b;
  }
  function hueOutside(h, range) {
    if (hueIn(h, range)) return 0;
    return Math.min(hueDist(h, range[0]), hueDist(h, range[1]));
  }
  function randomHue(range) {
    if (range === "any") return Math.random() * 360;
    const [a, b] = range;
    const w = a <= b ? b - a : b + 360 - a;
    return (a + Math.random() * w) % 360;
  }
  const rangeDist = (v, [a, b]) => (v < a ? a - v : v > b ? v - b : 0);

  /** Найконтрастніша пара в палітрі. */
  function bestPair(colors) {
    let best = { a: colors[0], b: colors[0], ratio: 1 };
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const r = contrast(colors[i], colors[j]);
        if (r > best.ratio) best = { a: colors[i], b: colors[j], ratio: r };
      }
    }
    // текст — темніший колір на світлішому
    if (luminance(best.a) > luminance(best.b)) best = { a: best.b, b: best.a, ratio: best.ratio };
    return best;
  }

  /** Гарантує пару з контрастом ≥ 4.5:1 — затемнює найтемніший і висвітлює найсвітліший колір. */
  function ensureContrast(colors) {
    if (bestPair(colors).ratio >= 4.5) return colors;
    const out = colors.slice();
    const lum = out.map(luminance);
    const iDark = lum.indexOf(Math.min(...lum));
    const iLight = lum.indexOf(Math.max(...lum));
    const dark = hexToHsl(out[iDark]);
    const light = hexToHsl(out[iLight]);
    for (let n = 0; n < 60 && contrast(out[iDark], out[iLight]) < 4.5; n++) {
      dark.l = Math.max(3, dark.l - 2.5);
      dark.s *= 0.94; // текстовий колір — глибший і спокійніший
      light.l = Math.min(98, light.l + 1.5);
      out[iDark] = hslToHex(dark.h, dark.s, dark.l);
      if (iLight !== iDark) out[iLight] = hslToHex(light.h, light.s, light.l);
    }
    return out;
  }

  /** Основний (домінантний) відтінок палітри — найнасиченіший колір. */
  function dominantHue(colors) {
    let best = null;
    colors.forEach((c) => {
      const hsl = hexToHsl(c);
      const w = hsl.s * (1 - Math.abs(hsl.l - 50) / 60);
      if (!best || w > best.w) best = { w, h: hsl.h };
    });
    return best ? best.h : 0;
  }

  function moodProfile(mood) {
    return {
      s: Array.isArray(mood.s) ? mood.s : [20, 70],
      l: Array.isArray(mood.l) ? mood.l : [15, 90],
      h: mood.h === "any" || !Array.isArray(mood.h) ? "any" : mood.h,
      accent: mood.accent || null,
    };
  }

  /** Наскільки кураторська палітра пасує настрою (менше — краще). */
  const CURATED_FIT = D.palettes.map((p) => p.colors.map(hexToHsl));
  function fitScore(index, prof) {
    const hsls = CURATED_FIT[index];
    let pen = 0;
    hsls.forEach(({ h, s, l }) => {
      pen += rangeDist(s, prof.s) * 0.55 + rangeDist(l, prof.l) * 0.35;
      if (prof.h !== "any" && s > 25 && l > 12 && l < 90) pen += Math.min(hueOutside(h, prof.h), 90) * 0.35;
    });
    return pen / hsls.length;
  }
  const CURATED_THRESHOLD = 12;

  function paletteIsDistinct(h, scheme, strict) {
    return S.recentPalettes.every((p) => (strict ? hueDist(p.h, h) >= 40 : hueDist(p.h, h) >= 40 || p.scheme !== scheme));
  }

  function generateProcedural(prof) {
    // база: шукаємо відтінок, далекий від останніх 5 палітр (≥ 40°), інакше — іншу схему
    let scheme, base;
    for (let attempt = 0; attempt < 4; attempt++) {
      scheme = SCHEMES[draw("scheme", SCHEMES.length)];
      base = randomHue(prof.h);
      for (let t = 0; t < 40 && !paletteIsDistinct(base, scheme.id, true); t++) base = randomHue(prof.h);
      if (paletteIsDistinct(base, scheme.id, true)) break;
      for (let t = 0; t < 30 && !paletteIsDistinct(base, scheme.id, false); t++) base = randomHue(prof.h);
      if (paletteIsDistinct(base, scheme.id, false)) break;
    }

    // драбина світлоти: рівномірно в межах настрою, але з мінімальним розкидом,
    // щоб сусідні кольори не зливалися (особливо в монохромній схемі)
    const [s0, s1] = prof.s;
    const minSpan = scheme.id === "mono" ? 52 : 28;
    let [l0, l1] = prof.l;
    if (l1 - l0 < minSpan) {
      const c = (l0 + l1) / 2;
      l0 = clamp(c - minSpan / 2, 5, 95 - minSpan);
      l1 = l0 + minSpan;
    }
    const ladder = [0, 1, 2, 3, 4].map((i) => clamp(l0 + (l1 - l0) * (i / 4) + rand(-1.5, 1.5), 3, 98));
    const order = shuffle([1, 2, 3]); // базовий відтінок — на середніх тонах
    const slots = [order[0], 0, 4, order[1], order[2]];
    let colors = scheme.offsets.map((o, i) => {
      const li = slots[i];
      const h = (base + o + rand(-6, 6) + 360) % 360;
      let s = rand(s0, s1);
      if (scheme.id !== "mono" && (li === 0 || li === 4)) s *= 0.55; // крайні тони — ближче до нейтральних
      if (scheme.id === "mono") s = clamp(s + rand(-12, 12), 0, 100);
      return { h, s, l: ladder[li] };
    });
    colors.sort((a, b) => a.l - b.l);
    let hex = colors.map((c) => hslToHex(c.h, c.s, c.l));
    if (prof.accent) hex[2] = prof.accent.toUpperCase();
    hex = ensureContrast(hex);
    return { colors: hex, scheme: scheme.id, schemeName: scheme.name, h: base, curated: false };
  }

  function generatePalette(mood) {
    const prof = moodProfile(mood);
    if (Math.random() < 0.5) {
      const recent = S.recentCurated;
      const i = draw("palette:curated", D.palettes.length, (k) => !recent.includes(k) && fitScore(k, prof) <= CURATED_THRESHOLD
        && paletteIsDistinct(dominantHue(D.palettes[k].colors), "curated", false), "soft");
      if (i >= 0) {
        const p = D.palettes[i];
        recent.push(i);
        S.recentCurated = recent.slice(-30);
        const colors = ensureContrast(p.colors.map((c) => c.toUpperCase()));
        return { colors, scheme: "curated", schemeName: "кураторська", name: p.name, h: dominantHue(colors), curated: true };
      }
    }
    return generateProcedural(prof);
  }

  /* ---------- Генерація полів брифу ---------- */
  const pairKey = (niche, format) => niche + "||" + format;
  const pairUsed = (niche, format) => S.pairs.includes(pairKey(niche, format));

  /* ---------- Сумісність формату й ніші ----------
     Теги ніші (niches.js → tags) проти requires / requiresAll / excludes формату (formats.js). */
  const nicheTags = (niche) => {
    const n = niche && NICHES[NICHE_INDEX.get(niche.text)];
    return n ? n.tags || [] : null; // null — ніша невідома (стара, з історії): сумісна з усім
  };
  function formatFits(f, tags) {
    if (!f || !tags) return true;
    const has = (t) => tags.includes(t);
    if (f.requires && f.requires.length && !f.requires.some(has)) return false;
    if (f.requiresAll && !f.requiresAll.every(has)) return false;
    if (f.excludes && f.excludes.some(has)) return false;
    return true;
  }
  const formatObj = (profId, name) => (PROF_BY_ID[profId] && PROF_BY_ID[profId].formats.find((f) => f.name === name)) || null;

  /** Shuffle bag для відфільтрованого пулу (ніші, формати).
      Кожне видане значення позначається номером поточного циклу. Беремо випадкове
      з тих, що пройшли фільтр і ще не видавались у цьому циклі; новий цикл починається,
      лише коли вичерпано саме відфільтровані варіанти — тож повторів немає, доки
      не закінчаться сумісні значення. tiers — фільтри від найсуворішого до м'якшого.
      -1 — фільтру не відповідає ніщо. */
  function drawTiered(key, n, tiers) {
    S.cycles = S.cycles && typeof S.cycles === "object" ? S.cycles : {};
    let st = S.cycles[key];
    if (!st || st.n !== n || typeof st.used !== "object") st = S.cycles[key] = { n, c: 1, used: {}, last: -1 };
    const all = [...Array(n).keys()];
    const take = (cands) => {
      const i = pick(cands);
      st.used[i] = st.c;
      st.last = i;
      return i;
    };
    const notLast = (i) => n < 2 || i !== st.last;
    for (const f of tiers) {
      const c = all.filter((i) => f(i) && (st.used[i] || 0) < st.c && notLast(i));
      if (c.length) return take(c);
    }
    st.c += 1; // відфільтрований пул вичерпано — новий цикл
    for (const f of tiers) {
      const c = all.filter((i) => f(i) && notLast(i));
      if (c.length) return take(c);
    }
    for (const f of tiers) {
      const c = all.filter(f);
      if (c.length) return take(c);
    }
    return -1;
  }

  /** Формат — лише сумісний із нішею; анти-повтори в межах відфільтрованого пулу. */
  function pickFormat(profId, niche, exclude) {
    const list = PROF_BY_ID[profId].formats;
    const tags = nicheTags(niche);
    const ok = (k) => formatFits(list[k], tags) && list[k].name !== exclude;
    let i = drawTiered("format:" + profId, list.length, [(k) => ok(k) && !(niche && pairUsed(niche.text, list[k].name)), ok]);
    if (i < 0) i = drawTiered("format:" + profId, list.length, [() => true]); // недосяжно: універсальні формати є в кожній професії
    return list[i].name;
  }
  const nicheObj = (i) => {
    const n = NICHES[i];
    return { text: n.text, cat: n.cat, emoji: n.emoji, ci: n.ci, type: n.type };
  };
  /** Ніша.
      format + profId  — формат заблокований: лише сумісні з ним ніші;
      requireAudience  — аудиторія заблокована: лише ніші, де вона є;
      excludeText      — не повертати поточну нішу.
      Повертає null, якщо таких ніш немає. */
  function pickNiche({ format = null, profId = null, ignoreCats = null, requireAudience = null, excludeText = null } = {}) {
    const cats = ignoreCats || S.recentCats;
    const fObj = format && profId ? formatObj(profId, format) : null;
    const base = (k) => NICHES[k].text !== excludeText
      && formatFits(fObj, NICHES[k].tags)
      && (!requireAudience || NICHES[k].audiences.includes(requireAudience));
    const fresh = (k) => !cats.includes(NICHES[k].ci) && (!format || !pairUsed(NICHES[k].text, format));
    const i = drawTiered("niche", NICHES.length, [(k) => base(k) && fresh(k), base]);
    return i < 0 ? null : nicheObj(i);
  }
  /** Аудиторія завжди з поточної ніші; окремий мішок для кожної ніші. */
  function pickAudience(nicheText, exclude) {
    const ni = NICHE_INDEX.get(nicheText);
    if (ni === undefined) return pick(ALL_AUDIENCES);
    const list = NICHES[ni].audiences;
    return list[draw("audience:" + ni, list.length, (k) => list[k] !== exclude)];
  }
  function pickMood() {
    const m = D.moods[draw("mood", D.moods.length)];
    return { name: m.name, index: D.moods.indexOf(m) };
  }
  function pickConstraint(profId, type, exclude = []) {
    const spec = D.constraints.byProfession[profId];
    const useSpec = spec && spec[type] && spec[type].length && Math.random() < SPECIFIC_CONSTRAINT_CHANCE;
    const pool = useSpec ? spec[type] : D.constraints[type];
    const key = useSpec ? `constraint:${profId}:${type}` : `constraint:general:${type}`;
    const i = draw(key, pool.length, (k) => !exclude.includes(pool[k]));
    return { text: pool[i], type, specific: !!useSpec };
  }
  function pickConstraints(profId, level, keepFirst) {
    const list = [];
    if (keepFirst) list.push(keepFirst);
    else {
      const type = level === "junior" ? "technical" : pick(["technical", "client"]);
      list.push(pickConstraint(profId, type));
    }
    if (level === "senior") {
      const other = list[0].type === "technical" ? "client" : "technical";
      list.push(pickConstraint(profId, other, [list[0].text]));
    }
    return list;
  }
  function pickDeadline(level) {
    if (level === "junior") return null;
    const pool = level === "senior" ? D.deadlines.hard : D.deadlines.normal;
    return pool[draw("deadline:" + level, pool.length)];
  }
  function pickName() {
    const lang = D.names[draw("lang", D.names.length)];
    const raw = lang.names[draw("name:" + lang.code, lang.names.length)];
    const base = { lang: lang.code, flag: lang.flag, langLabel: lang.label };
    return typeof raw === "string" ? { ...base, text: raw } : { ...base, text: raw.orig, latin: raw.latin, meaning: raw.meaning };
  }
  /** Wildcard. Твісти з audienceTwists підставляють аудиторію з ніші ІНШОЇ категорії —
      єдиний випадок, коли аудиторія навмисно не збігається з нішею. */
  function pickWildcard(niche, force = false) {
    if (!force && Math.random() >= WILDCARD_CHANCE) return null;
    const W = D.wildcards, T = D.audienceTwists || [];
    const i = draw("wildcard", W.length + T.length);
    const fromBag = (key, list, fallback) => (list && list.length ? list[draw(key, list.length)] : fallback);
    const meta = {
      sender: fromBag("twist:sender", D.clientSenders, { name: "Клієнт", role: "" }),
      followUp: Math.random() < 0.5 ? fromBag("twist:followUp", D.followUps, null) : null,
      subject: fromBag("twist:subject", D.emailSubjects, "RE: ТЕРМІНОВО"),
    };
    if (i < W.length) return { text: W[i], ...meta };
    const other = pick(NICHES.filter((n) => n.ci !== niche.ci));
    const audience = pick(other.audiences);
    return { text: T[i - W.length].replace("{audience}", audience), audience, fromCat: other.cat, ...meta };
  }
  const senderLabel = (s) => (!s ? "Клієнт" : s.role ? `${s.name}, ${s.role}` : s.name);
  const wildText = (w) => (!w ? "" : typeof w === "string" ? w : w.text);
  const pickProfession = () => PROFS[draw("profession", PROFS.length)].id;

  /** Новий бриф (повний оберт) з урахуванням замків. */
  function buildBrief(prev) {
    const L = S.locks;
    const level = S.settings.level;
    const keep = (k) => prev && L[k];
    let profId;
    if (keep("format")) profId = prev.profId;
    else profId = S.settings.prof === "any" ? pickProfession() : S.settings.prof;

    // спершу ніша (з урахуванням заблокованих формату й аудиторії), потім сумісний формат
    const lockedFormat = keep("format") ? prev.format : null;
    const excludeText = prev ? prev.niche.text : null;
    let niche = keep("niche") ? prev.niche : null;
    let audience = null;
    let audienceUnlocked = false;
    if (!niche && keep("audience")) {
      niche = pickNiche({ format: lockedFormat, profId, requireAudience: prev.audience, excludeText });
      if (niche) audience = prev.audience;
      else { L.audience = false; audienceUnlocked = true; }
    }
    if (!niche) niche = pickNiche({ format: lockedFormat, profId, excludeText }) || pickNiche({ excludeText });
    const format = lockedFormat || pickFormat(profId, niche);
    if (!audience) audience = keep("audience") && !audienceUnlocked ? prev.audience : pickAudience(niche.text);
    const mood = keep("mood") ? prev.mood : pickMood();
    const moodObj = D.moods[mood.index] || D.moods.find((m) => m.name === mood.name) || D.moods[0];

    return {
      id: uid(),
      ts: Date.now(),
      level,
      profId,
      profRandom: keep("format") ? prev.profRandom : S.settings.prof === "any",
      format,
      niche,
      audience,
      mood,
      constraints: pickConstraints(profId, level, keep("constraint") ? prev.constraints[0] : null),
      deadline: pickDeadline(level),
      name: prev && L.name ? prev.name : pickName(),
      palette: prev && L.palette ? prev.palette : generatePalette(moodObj),
      wildcard: null, // з'являється в брифі лише після «Прийняти виклик» у поп-апі
      _twist: pickWildcard(niche),
      _audienceUnlocked: audienceUnlocked,
    };
  }

  /** Перекрутити одне поле поточного брифу. */
  function rerollField(brief, key) {
    const b = JSON.parse(JSON.stringify(brief));
    switch (key) {
      case "format": b.format = pickFormat(b.profId, b.niche, b.format); break;
      case "niche": {
        const ignoreCats = S.recentCats.slice(0, -1).concat(b.niche.ci);
        const lockedFormat = S.locks.format ? b.format : null;
        const opts = { format: lockedFormat, profId: b.profId, ignoreCats, excludeText: b.niche.text };
        let n = null;
        if (S.locks.audience) {
          n = pickNiche({ ...opts, requireAudience: b.audience });
          if (!n) { S.locks.audience = false; b._audienceUnlocked = true; }
        }
        if (!n) n = pickNiche(opts) || pickNiche({ ignoreCats, excludeText: b.niche.text });
        b.niche = n;
        if (!S.locks.audience) b.audience = pickAudience(n.text, b.audience);
        // формат несумісний з новою нішею — перекручуємо його (якщо не заблокований)
        if (!S.locks.format && !formatFits(formatObj(b.profId, b.format), nicheTags(n))) b.format = pickFormat(b.profId, n, b.format);
        break;
      }
      case "audience": b.audience = pickAudience(b.niche.text, b.audience); break;
      case "mood": {
        b.mood = pickMood();
        if (!S.locks.palette) b.palette = generatePalette(D.moods[b.mood.index]);
        break;
      }
      case "constraint": b.constraints = pickConstraints(b.profId, b.level, null); break;
    }
    return b;
  }

  /** Фіксує бриф: історія анти-повторів, історія брифів, збереження. */
  function commit(brief, { isNew, changedKey, prevBrief } = {}) {
    const pk = pairKey(brief.niche.text, brief.format);
    if (!S.pairs.includes(pk)) S.pairs.push(pk);
    if (S.pairs.length > PAIRS_MAX) S.pairs.splice(0, S.pairs.length - PAIRS_MAX);

    if (isNew) {
      S.recentCats.push(brief.niche.ci);
    } else if (changedKey === "niche" && S.recentCats.length) {
      S.recentCats[S.recentCats.length - 1] = brief.niche.ci;
    }
    S.recentCats = S.recentCats.slice(-RECENT_CATS);

    const paletteChanged = !prevBrief || prevBrief.palette.colors.join() !== brief.palette.colors.join();
    if (paletteChanged) {
      S.recentPalettes.push({ h: Math.round(brief.palette.h), scheme: brief.palette.scheme });
      S.recentPalettes = S.recentPalettes.slice(-RECENT_PALETTES);
    }

    if (isNew) S.history.unshift(brief);
    else {
      const i = S.history.findIndex((h) => h.id === brief.id);
      if (i >= 0) S.history[i] = brief; else S.history.unshift(brief);
    }
    S.history = S.history.slice(0, HISTORY_MAX);
    S.current = brief;
    saveState();
  }

  /* ---------- Тексти для барабанів ---------- */
  function reelText(brief, key) {
    switch (key) {
      case "format": return cap(brief.format);
      case "niche": return cap(brief.niche.text);
      case "audience": return cap(brief.audience);
      case "mood": return brief.mood.name;
      case "constraint": return cap(brief.constraints[0].text);
    }
    return "";
  }
  function fillerPool(key) {
    switch (key) {
      case "format": {
        const p = S.settings.prof === "any" ? null : PROF_BY_ID[S.settings.prof];
        return p ? p.formats.map((f) => f.name) : ALL_FORMATS;
      }
      case "niche": return NICHES.map((n) => n.text);
      case "audience": return ALL_AUDIENCES;
      case "mood": return D.moods.map((m) => m.name);
      case "constraint": return ALL_CONSTRAINTS;
    }
    return ["?"];
  }
  function lenClass(text) {
    const n = text.length;
    return n >= 64 ? "len-xl" : n >= 44 ? "len-l" : n >= 26 ? "len-m" : "";
  }
  const itemHTML = (text, extra = "") => `<span class="reel__item ${lenClass(text)} ${extra}"><span>${esc(text)}</span></span>`;

  /* ---------- DOM ---------- */
  const el = {
    reels: $("#reels"),
    spin: $("#spinBtn"),
    chips: $("#profChips"),
    level: $("#levelSeg"),
    levelHint: $("#levelHint"),
    card: $("#briefCard"),
    empty: $("#briefEmpty"),
    toast: $("#toast"),
    histToggle: $("#historyToggle"),
    histPanel: $("#historyPanel"),
    histClose: $("#historyClose"),
    histList: $("#historyList"),
    histEmpty: $("#historyEmpty"),
    histClear: $("#historyClear"),
    histCount: $("#historyCount"),
    scrim: $("#scrim"),
    exportNode: $("#exportNode"),
  };

  const LOCK_SVG = `<svg class="lock__open" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0 1 9.6-1.9M5 11h14v10H5z"/></svg><svg class="lock__closed" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v4H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V7a5 5 0 0 0-5-5zm-3 9V7a3 3 0 1 1 6 0v4z"/></svg>`;

  const reelEls = REELS.map((r, i) => {
    const wrap = document.createElement("div");
    wrap.className = "reel";
    wrap.dataset.key = r.key;
    wrap.innerHTML = `
      <div class="reel__head">
        <span class="reel__label">${r.label}<span class="reel__key" aria-hidden="true">${i + 1}</span></span>
        <button class="lock" type="button" aria-pressed="false"></button>
      </div>
      <button class="reel__window" type="button">
        <span class="reel__lens" aria-hidden="true"></span>
        <span class="reel__strip" aria-hidden="true">${itemHTML("·", "is-placeholder")}${itemHTML("?", "is-placeholder")}${itemHTML("·", "is-placeholder")}</span>
      </button>`;
    el.reels.appendChild(wrap);
    const obj = { ...r, index: i, wrap, lock: $(".lock", wrap), win: $(".reel__window", wrap), strip: $(".reel__strip", wrap), spinning: false, text: null };
    obj.lock.innerHTML = LOCK_SVG;
    obj.lock.addEventListener("click", (e) => { e.stopPropagation(); toggleLock(r.key); });
    obj.win.addEventListener("click", () => spinOne(i));
    return obj;
  });

  function itemHeight(r) {
    const first = r.strip.firstElementChild;
    return first ? first.getBoundingClientRect().height : 112;
  }
  function setReelRest(r, text, { animateIn = false } = {}) {
    const pool = fillerPool(r.key);
    r.text = text;
    r.strip.innerHTML = itemHTML(pick(pool)) + itemHTML(text, "is-final") + itemHTML(pick(pool));
    r.strip.style.transform = `translate3d(0, ${-itemHeight(r)}px, 0)`;
    r.strip.style.filter = "none";
    if (animateIn) {
      r.strip.style.transition = "none";
      r.strip.style.opacity = "0";
      requestAnimationFrame(() => {
        r.strip.style.transition = "opacity .22s ease";
        r.strip.style.opacity = "1";
      });
    } else {
      r.strip.style.opacity = "1";
    }
    updateReelLabel(r);
  }
  function updateReelLabel(r) {
    const locked = !!S.locks[r.key];
    r.wrap.classList.toggle("is-locked", locked);
    r.lock.setAttribute("aria-pressed", String(locked));
    r.lock.setAttribute("aria-label", `${locked ? "Розблокувати" : "Заблокувати"} барабан «${r.label}»`);
    r.lock.title = locked ? "Розблокувати" : "Заблокувати";
    const val = r.text ? `: ${r.text}` : "";
    r.win.setAttribute("aria-label", `Барабан «${r.label}»${val}. ${locked ? "Заблоковано." : `Натисни, щоб перекрутити (клавіша ${r.index + 1}).`}`);
  }

  /* Пружна крива: кубічне ease-out з легким перельотом і поверненням. */
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const SETTLE_AT = 0.86;

  let instantMode = false; // для перевірок з консолі: SpinTheBrief.instant(true)
  function animateReel(r, finalText, duration) {
    return new Promise((resolve) => {
      if (document.hidden || instantMode) { // у фоновій вкладці rAF не працює — одразу ставимо результат
        setReelRest(r, finalText);
        resolve();
        return;
      }
      if (reducedMotion.matches) {
        setReelRest(r, finalText, { animateIn: true });
        setTimeout(resolve, 230);
        return;
      }
      const pool = fillerPool(r.key);
      const count = clamp(Math.round(duration / 75), 12, 34);
      const curText = r.text || "?";
      const items = [itemHTML(pick(pool)), itemHTML(curText)];
      for (let i = 0; i < count; i++) items.push(itemHTML(pick(pool)));
      items.push(itemHTML(finalText, "is-final"), itemHTML(pick(pool)));
      r.strip.style.transition = "none";
      r.strip.style.opacity = "1";
      r.strip.innerHTML = items.join("");
      const H = itemHeight(r);
      const startY = -H;
      const endY = -(count + 2) * H;
      const dist = endY - startY; // від'ємне
      const overshoot = -H * 0.14;
      const maxBlur = window.innerWidth < 600 ? 3.5 : 5;
      let t0 = null, lastY = startY, lastT = 0;

      const frame = (now) => {
        if (t0 === null) { t0 = now; lastT = now; }
        const t = clamp((now - t0) / duration, 0, 1);
        let y;
        if (t < SETTLE_AT) y = startY + (dist + overshoot) * easeOutCubic(t / SETTLE_AT);
        else y = endY + overshoot * (1 - easeInOutSine((t - SETTLE_AT) / (1 - SETTLE_AT)));
        const dt = Math.max(1, now - lastT);
        const speed = Math.abs(y - lastY) / dt; // px/мс
        const blur = clamp(speed * 1.1, 0, maxBlur);
        r.strip.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        r.strip.style.filter = blur > 0.35 ? `blur(${blur.toFixed(2)}px)` : "none";
        lastY = y; lastT = now;
        if (t < 1) requestAnimationFrame(frame);
        else {
          setReelRest(r, finalText);
          const fin = $(".is-final", r.strip);
          if (fin) fin.classList.add("landed");
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- Обертання ---------- */
  let busy = false; // йде повний оберт
  const anySpinning = () => reelEls.some((r) => r.spinning);

  async function spinAll() {
    if (busy || anySpinning()) return;
    busy = true;
    el.spin.disabled = true;
    el.card.classList.add("is-updating");
    const prev = S.current || null;
    const brief = buildBrief(prev);
    const unlocked = brief._audienceUnlocked;
    const twist = brief._twist;
    delete brief._audienceUnlocked;
    delete brief._twist;
    cancelTwist();
    if (unlocked) {
      updateReelLabel(reelEls.find((x) => x.key === "audience"));
      toast("Аудиторію оновлено під нову нішу");
    }
    const toSpin = reelEls.filter((r) => !(prev && S.locks[r.key]));
    const motion = !reducedMotion.matches;
    const jobs = toSpin.map((r, k) => {
      r.spinning = true;
      r.wrap.classList.add("is-spinning");
      r.win.setAttribute("aria-busy", "true");
      const duration = motion ? 1350 + k * 320 : 0;
      const delay = motion ? 0 : k * 90;
      return new Promise((res) => setTimeout(res, delay))
        .then(() => animateReel(r, reelText(brief, r.key), duration))
        .then(() => {
          r.spinning = false;
          r.wrap.classList.remove("is-spinning");
          r.win.removeAttribute("aria-busy");
        });
    });
    // заблоковані барабани лишаються, але оновлюємо підпис
    reelEls.filter((r) => !toSpin.includes(r)).forEach((r) => { if (!r.text) setReelRest(r, reelText(brief, r.key)); });
    await Promise.all(jobs);
    commit(brief, { isNew: true, prevBrief: prev });
    renderCard(brief, { fresh: true });
    renderHistory();
    busy = false;
    el.spin.disabled = false;
    scheduleTwist(brief, twist); // ~10%: «повідомлення від клієнта» через 1.2–1.8 с
  }

  const setSpinning = (r, on) => {
    r.spinning = on;
    r.wrap.classList.toggle("is-spinning", on);
    if (on) r.win.setAttribute("aria-busy", "true"); else r.win.removeAttribute("aria-busy");
  };

  async function spinOne(index) {
    const r = reelEls[index];
    if (!r || r.spinning || busy) return;
    if (!S.current) { spinAll(); return; }
    if (S.locks[r.key]) {
      toast(`Барабан «${r.label}» заблоковано 🔒`);
      r.wrap.animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 260 });
      return;
    }
    // ніша тягне за собою формат і аудиторію: поки крутиться одне з них, інші чекають
    const reelOf = (k) => reelEls.find((x) => x.key === k);
    const linked = ["format", "audience"];
    if (r.key === "niche" && linked.some((k) => reelOf(k).spinning)) return;
    if (linked.includes(r.key) && reelOf("niche").spinning) return;
    const prev = S.current;
    const next = rerollField(prev, r.key);
    const unlocked = next._audienceUnlocked;
    delete next._audienceUnlocked;
    const followers = r.key === "niche" ? linked.filter((k) => next[k] !== prev[k]).map(reelOf) : [];
    setSpinning(r, true);
    followers.forEach((f) => setSpinning(f, true));
    if (unlocked) {
      updateReelLabel(reelOf("audience"));
      toast("Аудиторію оновлено під нову нішу");
    }
    S.current = next; // одразу, щоб паралельні кліки по інших барабанах бачили зміни
    await animateReel(r, reelText(next, r.key), 1300);
    setSpinning(r, false);
    await Promise.all(followers.map((f, k) => animateReel(f, reelText(next, f.key), 950 + k * 250).then(() => setSpinning(f, false))));
    // інші барабани могли змінитися паралельно — беремо актуальний стан і переносимо наші поля
    const merged = { ...S.current };
    if (r.key === "mood") { merged.mood = next.mood; merged.palette = next.palette; }
    else if (r.key === "constraint") merged.constraints = next.constraints;
    else if (r.key === "niche") { merged.niche = next.niche; merged.audience = next.audience; merged.format = next.format; }
    else merged[r.key] = next[r.key];
    commit(merged, { isNew: false, changedKey: r.key, prevBrief: prev });
    renderCard(merged);
    renderHistory();
  }

  /* ---------- Замки ---------- */
  function toggleLock(key) {
    S.locks[key] = !S.locks[key];
    saveState();
    const r = reelEls.find((x) => x.key === key);
    if (r) updateReelLabel(r);
    else if (S.current) renderCard(S.current);
    const names = { name: "Назву", palette: "Палітру" };
    const what = r ? `Барабан «${r.label}»` : names[key];
    toast(`${what} ${S.locks[key] ? "заблоковано 🔒" : "розблоковано"}`);
  }

  /* ---------- Картка брифу ---------- */
  /** Клієнтські примхи — це цитати: беремо в лапки, якщо їх ще немає в базі. */
  function constraintText(c) {
    const t = cap(c.text.trim());
    return c.type === "client" && !/^[«"“„]/.test(t) ? `«${t}»` : t;
  }

  /** Тип ніші (B2C/B2B); для старих брифів з історії шукаємо за назвою. */
  function nicheType(b) {
    const t = b.niche.type || (NICHES[NICHE_INDEX.get(b.niche.text)] || {}).type;
    return t ? TYPE_NAME[t] : "";
  }
  function profName(id) { return (PROF_BY_ID[id] || ANY).name; }

  function renderCard(b, { fresh = false } = {}) {
    el.empty.hidden = true;
    el.card.hidden = false;
    el.card.classList.remove("is-updating");
    const n = b.name;
    const isAsian = !!n.latin;
    const pair = bestPair(b.palette.colors);
    const level = LEVELS[b.level] || LEVELS.middle;
    const twist = b.wildcard && b.wildcard.audience ? b.wildcard : null;
    const lockBtn = (key, label) => `<button class="lock mini-lock" type="button" data-lock="${key}" aria-pressed="${!!S.locks[key]}" aria-label="${S.locks[key] ? "Розблокувати" : "Заблокувати"} ${label}" title="${S.locks[key] ? "Розблокувати" : "Заблокувати"}">${LOCK_SVG}</button>`;

    el.card.innerHTML = `
      <div class="card__top">
        <div class="client">
          <p class="eyebrow">Клієнт</p>
          <h3 class="client__name" lang="${n.lang}"><span class="client__flag" aria-hidden="true">${n.flag}</span>${esc(n.text)}</h3>
          ${isAsian ? `<div class="client__latin">${esc(n.latin)}</div><div class="client__meaning">«${esc(n.meaning)}»</div>` : ""}
          <div class="client__meta">Назва: <strong>${esc(n.langLabel)}</strong> мова</div>
        </div>
        ${lockBtn("name", "назву компанії")}
      </div>

      <div class="card__chips">
        <span class="pill">Рівень: ${level.label}</span>
        ${b.profRandom ? `<span class="pill pill--accent">🎲 Професія: ${esc(profName(b.profId))}</span>` : `<span class="pill">${esc((PROF_BY_ID[b.profId] || ANY).emoji)} ${esc(profName(b.profId))}</span>`}
        ${b.deadline ? `<span class="pill pill--deadline">⏱ Дедлайн: ${esc(b.deadline)}</span>` : ""}
      </div>

      <div class="grid">
        <div class="field"><p class="field__label">Формат</p><p class="field__value">${esc(cap(b.format))}</p></div>
        <div class="field"><p class="field__label">Ніша</p><p class="field__value">${esc(cap(b.niche.text))}</p><p class="field__sub">${b.niche.emoji} ${esc(b.niche.cat)}${nicheType(b) ? " · " + nicheType(b) : ""}</p></div>
        <div class="field"><p class="field__label">Аудиторія</p><p class="field__value">${esc(cap(b.audience))}</p>${twist ? `<p class="field__sub field__sub--twist">⚡ Твіст від клієнта змінює аудиторію — див. нижче</p>` : ""}</div>
        <div class="field"><p class="field__label">Настрій</p><p class="field__value">${esc(b.mood.name)}</p></div>
      </div>

      <div class="section-head">
        <h3>Палітра</h3>
        <div class="section-head__actions">
          <button class="btn btn--tinted btn--small" type="button" data-action="copy-palette" aria-label="Скопіювати всю палітру">Скопіювати всі</button>
          ${lockBtn("palette", "палітру")}
        </div>
      </div>
      <div class="palette">
        ${b.palette.colors.map((c) => {
          const fg = contrast(c, "#000000") > contrast(c, "#FFFFFF") ? "#000" : "#fff";
          return `<button class="swatch" type="button" data-hex="${c}" aria-label="Скопіювати колір ${c}">
            <span class="swatch__color" style="background:${c}"><span class="swatch__copied" style="color:${fg}">✓</span></span>
            <span class="swatch__hex">${c}</span></button>`;
        }).join("")}
      </div>
      <p class="palette__meta">${b.palette.curated ? `Кураторська «${esc(b.palette.name)}»` : `Схема: ${esc(b.palette.schemeName)}`} · під настрій «${esc(b.mood.name)}» · текст ${pair.a} на ${pair.b} — ${pair.ratio.toFixed(1)}:1</p>

      <div class="section-head"><h3>Обмеження${b.constraints.length > 1 ? " · 2" : ""}</h3></div>
      ${b.constraints.map((c) => `
        <div class="constraint" role="note">
          <span class="constraint__icon" aria-hidden="true">⚠️</span>
          <p class="constraint__text"><span class="constraint__type">${TYPE_LABEL[c.type]}${c.specific ? " · для професії" : ""}</span>${esc(constraintText(c))}</p>
        </div>`).join("")}

      ${b.wildcard ? `
        <div class="wildcard" id="wildcardBlock" role="note">
          <div class="wildcard__inner">
            <span class="wildcard__icon" aria-hidden="true">⚡</span>
            <div class="wildcard__text">
              <span class="twist-badge">⚡ Твіст від клієнта</span>
              <p class="wildcard__quote">«${esc(wildText(b.wildcard))}»</p>
              <span class="wildcard__note">— ${esc(senderLabel(b.wildcard.sender))}${twist ? ` · аудиторія навмисно не з цієї ніші (категорія «${esc(twist.fromCat)}»)` : ""}</span>
            </div>
          </div>
        </div>` : ""}

      <div class="card__actions">
        <button class="btn btn--ghost" type="button" data-action="copy-brief">
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 9h11v11H9zM5 15H4V4h11v1"/></svg>
          Скопіювати бриф</button>
        <div class="export-group">
          <label class="visually-hidden" for="exportSize">Розмір PNG</label>
          <select id="exportSize">
            <option value="1350" ${S.settings.exportSize === "1350" ? "selected" : ""}>1080×1350</option>
            <option value="1920" ${S.settings.exportSize === "1920" ? "selected" : ""}>1080×1920</option>
          </select>
          <button class="btn btn--ghost" type="button" data-action="png">
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>
            Завантажити PNG</button>
        </div>
        <span class="spacer"></span>
        <button class="btn btn--primary" type="button" data-action="new">Новий бриф</button>
      </div>`;

    if (fresh) {
      el.card.classList.remove("is-fresh");
      void el.card.offsetWidth;
      el.card.classList.add("is-fresh");
    }
  }

  el.card.addEventListener("click", (e) => {
    const lock = e.target.closest("[data-lock]");
    if (lock) { toggleLock(lock.dataset.lock); return; }
    const sw = e.target.closest(".swatch");
    if (sw) {
      copyText(sw.dataset.hex, `Скопійовано ${sw.dataset.hex}`);
      sw.classList.add("copied");
      setTimeout(() => sw.classList.remove("copied"), 900);
      return;
    }
    const act = e.target.closest("[data-action]");
    if (!act || !S.current) return;
    const a = act.dataset.action;
    if (a === "copy-palette") copyText(S.current.palette.colors.join(", "), "Палітру скопійовано");
    else if (a === "copy-brief") copyText(briefToText(S.current), "Бриф скопійовано");
    else if (a === "png") exportPNG(S.current);
    else if (a === "new") {
      const m = $(".machine");
      if (m.getBoundingClientRect().top < 0) m.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      spinAll();
    }
  });
  el.card.addEventListener("change", (e) => {
    if (e.target.id === "exportSize") { S.settings.exportSize = e.target.value; saveState(); }
  });

  function briefToText(b) {
    const n = b.name;
    const nameLine = n.latin ? `${n.text} (${n.latin}) — «${n.meaning}»` : n.text;
    const lines = [
      "🎰 ДИЗАЙН-БРИФ · Spin the Brief",
      "",
      `Клієнт: ${n.flag} ${nameLine}`,
      `Професія: ${profName(b.profId)}${b.profRandom ? " (випадкова)" : ""}`,
      `Рівень: ${(LEVELS[b.level] || LEVELS.middle).label}`,
      `Формат: ${cap(b.format)}`,
      `Ніша: ${cap(b.niche.text)} (${b.niche.cat}${nicheType(b) ? ", " + nicheType(b) : ""})`,
      `Аудиторія: ${cap(b.audience)}`,
      `Настрій: ${b.mood.name}`,
      `Палітра: ${b.palette.colors.join(" ")}`,
      ...b.constraints.map((c, i) => `⚠️ Обмеження${b.constraints.length > 1 ? " " + (i + 1) : ""}: ${constraintText(c)}`),
    ];
    if (b.deadline) lines.push(`⏱ Дедлайн: ${b.deadline}`);
    if (b.wildcard) lines.push(`⚡ Твіст від клієнта (${senderLabel(b.wildcard.sender)}): «${wildText(b.wildcard)}»${b.wildcard.audience ? " — аудиторія навмисно не з ніші" : ""}`);
    lines.push("", `— by ${AUTHOR.name} · ${AUTHOR.igUrl}`);
    return lines.join("\n");
  }

  /* ---------- Буфер обміну ---------- */
  async function copyText(text, msg) {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; }
    } catch (_) { /* фолбек нижче */ }
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      ta.remove();
    }
    toast(ok ? msg : "Не вдалося скопіювати 😕");
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  /* ---------- Експорт PNG ---------- */
  function exportHTML(b, tall) {
    const n = b.name;
    const field = (l, v, wide) => `<div class="ex-field${wide ? " wide" : ""}"><div class="l">${l}</div><div class="v">${esc(v)}</div></div>`;
    return `
      <div class="ex-top"><span>🎰 <b>Spin the Brief</b></span><span>Дизайн-бриф</span></div>
      <div>
        <p class="ex-eyebrow">Клієнт</p>
        <h1 class="ex-name${tall ? " ex-tall-name" : ""}">${n.flag} ${esc(n.text)}</h1>
        <div class="ex-sub">${n.latin ? `${esc(n.latin)} · «${esc(n.meaning)}»` : `${esc(cap(n.langLabel))} мова`}</div>
      </div>
      <div class="ex-pills">
        <span>${esc(profName(b.profId))}</span>
        <span>${(LEVELS[b.level] || LEVELS.middle).label}</span>
        ${b.deadline ? `<span>⏱ ${esc(b.deadline)}</span>` : ""}
      </div>
      <div class="ex-grid">
        ${field("Формат", cap(b.format), true)}
        ${field("Ніша", cap(b.niche.text))}
        ${field("Аудиторія", cap(b.audience))}
        ${field("Настрій", b.mood.name, true)}
      </div>
      <div class="ex-pal">${b.palette.colors.map((c) => `<div><i style="background:${c}"></i><span>${c}</span></div>`).join("")}</div>
      ${b.constraints.map((c) => `<div class="ex-warn">⚠️ ${esc(constraintText(c))}</div>`).join("")}
      ${b.wildcard ? `<div class="ex-wild"><div><span class="ex-wild__badge">⚡ Твіст від клієнта</span>«${esc(wildText(b.wildcard))}»<span class="ex-wild__from">— ${esc(senderLabel(b.wildcard.sender))}</span></div></div>` : ""}
      <div class="ex-foot"><span>${esc(b.niche.emoji)} ${esc(b.niche.cat)}</span><span class="ex-credit">by ${AUTHOR.name} · ${AUTHOR.ig}</span></div>`;
  }

  async function exportPNG(b) {
    if (typeof window.html2canvas !== "function") { toast("Бібліотека експорту ще завантажується або недоступна офлайн"); return; }
    const size = S.settings.exportSize === "1920" ? 1920 : 1350;
    const tall = size === 1920;
    const node = el.exportNode;
    node.className = "export" + (tall ? " tall" : "");
    node.innerHTML = exportHTML(b, tall);
    // якщо контент не вміщується (твіст + 2 обмеження) — ущільнюємо, щоб водяний знак завжди був видно
    const host = node.parentElement;
    host.style.left = "0";
    host.style.visibility = "hidden";
    for (const lvl of ["tight", "dense", "denser"]) {
      if (node.scrollHeight <= size + 1) break;
      node.classList.add(lvl);
      if (lvl !== "tight") node.classList.remove("tight");
    }
    host.style.left = "";
    host.style.visibility = "";
    toast("Готую PNG…");
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas = await window.html2canvas(node, {
        width: 1080, height: size, scale: 1, backgroundColor: "#f5f5f7",
        windowWidth: 1080, windowHeight: size, logging: false, useCORS: true,
        onclone: (doc) => { const host = doc.querySelector(".export-host"); if (host) host.style.left = "0"; },
      });
      await new Promise((res, rej) => canvas.toBlob((blob) => {
        if (!blob) { rej(new Error("blob")); return; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `brief-${b.id}-1080x${size}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        res();
      }, "image/png"));
      toast(`PNG 1080×${size} збережено`);
    } catch (err) {
      console.warn(err);
      toast("Не вдалося створити PNG 😕");
    } finally {
      node.innerHTML = "";
    }
  }

  /* ---------- Історія ---------- */
  function renderHistory() {
    const list = S.history;
    el.histCount.textContent = String(list.length);
    el.histCount.dataset.zero = String(list.length === 0);
    el.histToggle.setAttribute("aria-label", `Історія брифів: ${list.length}`);
    el.histEmpty.hidden = list.length > 0;
    el.histClear.hidden = list.length === 0;
    el.histList.innerHTML = list.map((b) => `
      <li><button class="history__item${S.current && S.current.id === b.id ? " is-current" : ""}" type="button" data-id="${b.id}">
        <span class="history__name">${b.name.flag} ${esc(b.name.text)}</span>
        <span class="history__desc">${esc(cap(b.format))} · ${esc(b.niche.text)} · ${esc(b.mood.name)}</span>
        <span class="history__strip" aria-hidden="true">${b.palette.colors.map((c) => `<span style="background:${c}"></span>`).join("")}</span>
      </button></li>`).join("");
  }
  el.histList.addEventListener("click", (e) => {
    const btn = e.target.closest(".history__item");
    if (!btn || busy || anySpinning()) return;
    const b = S.history.find((h) => h.id === btn.dataset.id);
    if (!b) return;
    cancelTwist();
    S.current = b;
    saveState();
    reelEls.forEach((r) => setReelRest(r, reelText(b, r.key), { animateIn: true }));
    renderCard(b, { fresh: true });
    renderHistory();
    closeHistory();
    toast("Бриф відновлено");
  });
  el.histClear.addEventListener("click", () => {
    S.history = S.current ? [S.current] : [];
    saveState();
    renderHistory();
    toast("Історію очищено");
  });

  let lastFocus = null;
  function openHistory() {
    lastFocus = document.activeElement;
    el.histPanel.hidden = false;
    el.scrim.hidden = false;
    el.histToggle.setAttribute("aria-expanded", "true");
    el.histClose.focus();
  }
  function closeHistory() {
    if (el.histPanel.hidden) return;
    el.histPanel.hidden = true;
    el.scrim.hidden = true;
    el.histToggle.setAttribute("aria-expanded", "false");
    (lastFocus && document.contains(lastFocus) ? lastFocus : el.histToggle).focus();
  }
  el.histToggle.addEventListener("click", () => (el.histPanel.hidden ? openHistory() : closeHistory()));
  el.histClose.addEventListener("click", closeHistory);
  el.scrim.addEventListener("click", closeHistory);

  /* ---------- Професії та рівень ---------- */
  function renderChips() {
    const all = [...PROFS, ANY];
    el.chips.innerHTML = all.map((p) => `<button class="chip" type="button" role="radio" data-prof="${p.id}" aria-checked="${S.settings.prof === p.id}" tabindex="${S.settings.prof === p.id ? 0 : -1}"><span aria-hidden="true">${p.emoji}</span>${esc(p.name)}</button>`).join("");
  }
  function setProf(id) {
    if (!PROF_BY_ID[id] && id !== "any") return;
    S.settings.prof = id;
    saveState();
    el.chips.querySelectorAll(".chip").forEach((c) => {
      const on = c.dataset.prof === id;
      c.setAttribute("aria-checked", String(on));
      c.tabIndex = on ? 0 : -1;
    });
  }
  el.chips.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (c) setProf(c.dataset.prof);
  });

  const LEVEL_KEYS = Object.keys(LEVELS);
  function setLevel(level) {
    if (!LEVELS[level]) return;
    S.settings.level = level;
    saveState();
    el.level.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.level === level;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $(".segmented__thumb", el.level).style.transform = `translateX(${LEVEL_KEYS.indexOf(level) * 100}%)`;
    el.levelHint.textContent = LEVELS[level].hint;
  }
  el.level.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-level]");
    if (b) setLevel(b.dataset.level);
  });

  /* Навігація стрілками всередині radiogroup */
  function radioKeys(group, selector, onPick) {
    group.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      const items = [...group.querySelectorAll(selector)];
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[(i + keys[e.key] + items.length) % items.length];
      next.focus();
      onPick(next);
    });
  }
  radioKeys(el.chips, ".chip", (c) => setProf(c.dataset.prof));
  radioKeys(el.level, "button[data-level]", (b) => setLevel(b.dataset.level));

  /* ---------- Поп-ап «повідомлення від клієнта» (wildcard) ----------
     Після «Обертати» з імовірністю ~10% клієнт пише / дзвонить / надсилає лист чи голосове.
     Твіст потрапляє в бриф лише після «Прийняти виклик». */
  const TW = {
    overlay: $("#twistOverlay"),
    dialog: $("#twistDialog"),
    body: $("#twistBody"),
    live: $("#twistLive"),
    actions: $("#twistActions"),
    tip: $("#twistTip"),
    accept: $('[data-twist="accept"]'),
    refuse: $('[data-twist="refuse"]'),
    timer: 0,
    timeouts: [],
    twist: null,
    briefId: null,
    refusals: 0,
    lastAttempt: 0,
    offset: { x: 0, y: 0 },
    lastFocus: null,
  };
  const TWIST_FORMATS = ["messenger", "call", "email", "voice"];
  const REFUSE_TIPS = ["З клієнтами так не буває 😅", "Клієнт уже вас тегнув у чаті 👀", "Відмова не входить у бюджет 💸"];
  const later = (fn, ms) => { TW.timeouts.push(setTimeout(fn, ms)); };
  const twistIsOpen = () => !TW.overlay.hidden;

  function scheduleTwist(brief, twist) {
    cancelTwist();
    if (!twist) return;
    TW.timer = setTimeout(() => openTwist(brief.id, twist), 1200 + Math.random() * 600);
  }
  function cancelTwist() {
    clearTimeout(TW.timer);
    TW.timer = 0;
  }

  function avatarHTML(sender, extra = "") {
    const name = sender ? sender.name : "Клієнт";
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
    const ini = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return `<span class="tw-avatar ${extra}" style="--av-h:${h}" aria-hidden="true">${esc(ini)}</span>`;
  }
  const bubble = (text) => `<div class="tw-bubble tw-pop">${esc(text)}</div>`;
  const typingHTML = `<div class="tw-bubble tw-typing tw-pop" aria-label="друкує"><i></i><i></i><i></i></div>`;

  /* Звук: короткий «дзинь» через WebAudio, за замовчуванням вимкнено. */
  let audioCtx = null;
  function ding() {
    if (!S.settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t = audioCtx.currentTime;
      [880, 1318.5].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const st = t + i * 0.13;
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.16, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.38);
        o.connect(g).connect(audioCtx.destination);
        o.start(st);
        o.stop(st + 0.42);
      });
    } catch (_) { /* без звуку */ }
  }
  const soundBtn = $("#soundToggle");
  function renderSound() {
    const on = !!S.settings.sound;
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.setAttribute("aria-label", `Звук сповіщень від клієнта: ${on ? "увімкнено" : "вимкнено"}`);
    soundBtn.title = on ? "Звук сповіщень увімкнено" : "Звук сповіщень вимкнено";
  }
  soundBtn.addEventListener("click", () => {
    S.settings.sound = !S.settings.sound;
    saveState();
    renderSound();
    if (S.settings.sound) ding();
    toast(S.settings.sound ? "🔔 Звук сповіщень увімкнено" : "🔕 Звук сповіщень вимкнено");
  });

  /** Показати текст твісту, кнопки та оголосити його скрінрідеру. */
  function revealTwist() {
    if (!TW.actions.hidden) return;
    TW.actions.hidden = false;
    TW.live.textContent = `${senderLabel(TW.twist.sender)}: ${TW.twist.text}${TW.twist.followUp ? ". " + TW.twist.followUp : ""}`;
    const a = document.activeElement;
    if (!a || a === document.body || a === TW.dialog || !TW.dialog.contains(a) || a.closest("[hidden]")) TW.accept.focus();
  }

  function runMessenger(t) {
    const who = senderLabel(t.sender);
    TW.body.innerHTML = `
      <div class="tw-chat">
        <div class="tw-chat__head">${avatarHTML(t.sender)}<div><b>${esc(who)}</b><span>онлайн</span></div><span class="tw-chat__time">щойно</span></div>
        <div class="tw-chat__list" id="twList">${typingHTML}</div>
      </div>`;
    const list = $("#twList");
    later(() => {
      list.innerHTML = bubble(t.text);
      if (t.followUp) {
        later(() => { list.insertAdjacentHTML("beforeend", typingHTML); }, 600);
        later(() => {
          list.lastElementChild.remove();
          list.insertAdjacentHTML("beforeend", bubble(t.followUp));
          revealTwist();
        }, 1500);
      } else revealTwist();
    }, 1000 + Math.random() * 500);
  }

  function runCall(t) {
    const who = senderLabel(t.sender);
    TW.body.innerHTML = `
      <div class="tw-call">
        <p class="tw-call__state">Вхідний дзвінок…</p>
        ${avatarHTML(t.sender, "tw-avatar--xl tw-pulse")}
        <p class="tw-call__name">${esc(who)}</p>
        <div class="tw-call__btns">
          <button type="button" class="tw-round tw-round--decline" data-call="decline" aria-label="Відхилити дзвінок">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85a1 1 0 0 1-1.4-.02L.29 13.08a1 1 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67a1 1 0 0 1 0 1.41l-2.49 2.47a1 1 0 0 1-1.4.02 11.3 11.3 0 0 0-2.67-1.85 1 1 0 0 1-.56-.9v-3.1A15 15 0 0 0 12 9z"/></svg>
          </button>
          <button type="button" class="tw-round tw-round--answer" data-call="answer" aria-label="Відповісти на дзвінок">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
          </button>
        </div>
        <p class="tw-call__hint" id="twCallHint" aria-live="polite"></p>
      </div>`;
    later(() => { const b = TW.body.querySelector('[data-call="answer"]'); if (b) b.focus(); }, 50);
  }
  function answerCall() {
    const t = TW.twist;
    const who = senderLabel(t.sender);
    TW.body.innerHTML = `
      <div class="tw-call tw-call--live">
        <p class="tw-call__state"><span id="twTimer">00:00</span> · розмова</p>
        ${avatarHTML(t.sender, "tw-avatar--lg")}
        <p class="tw-call__name">${esc(who)}</p>
        <p class="tw-subs tw-pop">«${esc(t.text)}»</p>
      </div>`;
    let sec = 0;
    const tick = () => {
      const el2 = $("#twTimer");
      if (!el2) return;
      sec += 1;
      el2.textContent = `00:${String(sec).padStart(2, "0")}`;
      if (sec < 59) later(tick, 1000);
    };
    later(tick, 1000);
    later(revealTwist, 500);
  }

  function runEmail(t) {
    const who = senderLabel(t.sender);
    const mail = (t.sender && t.sender.name ? t.sender.name : "client").toLowerCase().replace(/[^a-z]/g, "") || "client";
    TW.body.innerHTML = `
      <div class="tw-mail">
        <div class="tw-mail__bar"><i></i><i></i><i></i><span>Вхідні · 1 непрочитаний</span></div>
        <div class="tw-mail__head">
          ${avatarHTML(t.sender)}
          <div class="tw-mail__meta"><b>${esc(who)}</b><span>${esc(mail)}@client-mail.com · щойно</span></div>
          <span class="tw-mail__flag" title="Позначено як важливе" aria-label="Позначено як важливе">🚩</span>
        </div>
        <p class="tw-mail__subject">${esc(t.subject || "RE: ТЕРМІНОВО")}</p>
        <div class="tw-mail__text"><p>Добрий день!</p><p>${esc(t.text)}</p>${t.followUp ? `<p>P.S. ${esc(t.followUp)}</p>` : ""}<p class="tw-mail__sign">Надіслано з iPhone</p></div>
      </div>`;
    later(revealTwist, 450);
  }

  function runVoice(t) {
    const who = senderLabel(t.sender);
    const bars = Array.from({ length: 34 }, (_, i) => `<i style="--h:${(20 + Math.abs(Math.sin(i * 1.7)) * 80).toFixed(0)}%;--d:${(i % 7) * 0.08}s"></i>`).join("");
    const dur = 2000 + Math.random() * 1000;
    TW.body.innerHTML = `
      <div class="tw-chat">
        <div class="tw-chat__head">${avatarHTML(t.sender)}<div><b>${esc(who)}</b><span>голосове повідомлення</span></div><span class="tw-chat__time">щойно</span></div>
        <div class="tw-voice tw-pop is-playing" id="twVoice">
          <span class="tw-voice__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></span>
          <span class="tw-voice__wave" aria-hidden="true">${bars}</span>
          <span class="tw-voice__time">0:0${Math.round(dur / 1000) + 4}</span>
        </div>
        <div id="twTranscript"></div>
      </div>`;
    later(() => {
      const v = $("#twVoice");
      if (v) v.classList.remove("is-playing");
      $("#twTranscript").innerHTML = `<div class="tw-transcript tw-pop"><span>Розшифровка</span>${esc(t.text)}${t.followUp ? `<br>${esc(cap(t.followUp))}` : ""}</div>`;
      revealTwist();
    }, dur);
  }

  function openTwist(briefId, twist, forcedFormat) {
    if (!S.current || S.current.id !== briefId || busy || anySpinning() || twistIsOpen()) return;
    closeHistory();
    TW.twist = twist;
    TW.briefId = briefId;
    TW.refusals = 0;
    TW.offset = { x: 0, y: 0 };
    TW.refuse.hidden = false;
    TW.refuse.style.transform = "";
    TW.tip.textContent = "";
    TW.actions.hidden = true;
    TW.live.textContent = "";
    TW.lastFocus = document.activeElement;
    const format = TWIST_FORMATS.includes(forcedFormat) ? forcedFormat : TWIST_FORMATS[draw("twist:format", TWIST_FORMATS.length)]; // без повторів підряд
    TW.dialog.className = `twist twist--${format}`;
    TW.dialog.setAttribute("aria-label", { messenger: "Повідомлення від клієнта", call: "Вхідний дзвінок від клієнта", email: "Терміновий лист від клієнта", voice: "Голосове повідомлення від клієнта" }[format]);
    [...document.body.children].forEach((n) => { if (n !== TW.overlay && n.id !== "toast" && n.tagName !== "SCRIPT") n.inert = true; });
    TW.overlay.hidden = false;
    void TW.dialog.offsetWidth;
    TW.dialog.classList.add("is-in");
    TW.dialog.focus();
    ding();
    const touched = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && touched && window.matchMedia("(pointer: coarse)").matches) { try { navigator.vibrate(200); } catch (_) { /* ок */ } }
    ({ messenger: runMessenger, call: runCall, email: runEmail, voice: runVoice })[format](twist);
  }

  function closeTwist() {
    TW.timeouts.forEach(clearTimeout);
    TW.timeouts = [];
    TW.overlay.hidden = true;
    TW.body.innerHTML = "";
    [...document.body.children].forEach((n) => { n.inert = false; });
    const back = TW.lastFocus && document.contains(TW.lastFocus) ? TW.lastFocus : el.spin;
    back.focus();
  }

  function acceptTwist() {
    if (!twistIsOpen()) return;
    const twist = TW.twist;
    const briefId = TW.briefId;
    closeTwist();
    if (!S.current || S.current.id !== briefId) return;
    const b = { ...S.current, wildcard: { ...twist, accepted: true } };
    commit(b, { isNew: false, changedKey: "wildcard", prevBrief: S.current });
    renderCard(b);
    renderHistory();
    const block = $("#wildcardBlock");
    if (block) {
      block.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
      block.classList.add("is-new");
    }
    toast("⚡ Твіст від клієнта додано в бриф");
  }

  /** «Відмовитися» відскакує, показує підказку, а після 3 спроб зникає. */
  function refuseAttempt() {
    const now = Date.now();
    if (TW.refuse.hidden || now - TW.lastAttempt < 350) return;
    TW.lastAttempt = now;
    TW.refusals += 1;
    if (TW.refusals >= 3) {
      TW.refuse.hidden = true;
      TW.tip.textContent = "Кнопка «Відмовитися» втекла. Назавжди 🏃";
      TW.accept.focus();
      return;
    }
    TW.tip.textContent = REFUSE_TIPS[(TW.refusals - 1) % REFUSE_TIPS.length];
    if (reducedMotion.matches) return;
    const d = TW.dialog.getBoundingClientRect();
    const r = TW.refuse.getBoundingClientRect();
    const baseLeft = r.left - TW.offset.x;
    const baseTop = r.top - TW.offset.y;
    const pad = 14;
    // нова позиція в межах поп-апу, але не поверх «Прийняти виклик»
    const acc = TW.accept.getBoundingClientRect();
    let nx = 0, ny = 0;
    for (let k = 0; k < 20; k++) {
      nx = d.left + pad + Math.random() * Math.max(0, d.width - r.width - pad * 2);
      ny = d.top + pad + Math.random() * Math.max(0, d.height - r.height - pad * 2);
      const hit = nx < acc.right + 8 && nx + r.width > acc.left - 8 && ny < acc.bottom + 8 && ny + r.height > acc.top - 8;
      if (!hit) break;
    }
    TW.offset = { x: nx - baseLeft, y: ny - baseTop };
    TW.refuse.style.transform = `translate(${TW.offset.x.toFixed(0)}px, ${TW.offset.y.toFixed(0)}px)`;
  }
  TW.refuse.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") refuseAttempt(); });
  TW.refuse.addEventListener("click", refuseAttempt);
  TW.accept.addEventListener("click", acceptTwist);
  TW.body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-call]");
    if (!b) return;
    if (b.dataset.call === "answer") answerCall();
    else {
      const hint = $("#twCallHint");
      if (hint) hint.textContent = "Клієнт передзвонить. Знову. І знову 📞";
      if (!reducedMotion.matches) TW.dialog.animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(0)" }], { duration: 320 });
    }
  });

  /* Фокус-пастка + Esc = «Прийняти виклик». */
  TW.dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); acceptTwist(); return; }
    if (e.key !== "Tab") return;
    const items = [...TW.dialog.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")]
      .filter((n) => !n.disabled && !n.closest("[hidden]") && n.offsetParent !== null);
    if (!items.length) { e.preventDefault(); TW.dialog.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === TW.dialog)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  renderSound();

  /* ---------- Клавіатура ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (twistIsOpen()) return; // поп-ап клієнта має власну клавіатуру
    const t = e.target instanceof Element ? e.target : document.body;
    if (t.closest("input, textarea, select, [contenteditable='true']")) return;
    if (e.key === "Escape") { closeHistory(); return; }
    if (!el.histPanel.hidden) return;
    const onControl = t.closest("button, a, [role='radio']");
    if ((e.key === " " || e.key === "Enter") && !onControl) {
      e.preventDefault();
      spinAll();
      return;
    }
    if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      spinOne(Number(e.key) - 1);
    }
  });

  el.spin.addEventListener("click", spinAll);

  /* ---------- Старт ---------- */
  // Пасхалка для тих, хто зазирає в консоль 👀
  try {
    console.log(
      `%c👋 Зроблено ${AUTHOR.name}%c Instagram: ${AUTHOR.ig} → https://www.${AUTHOR.igUrl}/`,
      "font: 700 15px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #fff; background: linear-gradient(120deg, #8e2fd0, #e0144c); padding: 6px 12px; border-radius: 8px 0 0 8px;",
      "font: 500 13px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #1d1d1f; background: #f5f5f7; padding: 7px 12px; border-radius: 0 8px 8px 0;"
    );
  } catch (_) { /* ок */ }

  function validBrief(b) {
    return b && b.name && b.palette && Array.isArray(b.palette.colors) && b.niche && b.mood && Array.isArray(b.constraints) && b.constraints.length && b.format && b.audience && PROF_BY_ID[b.profId];
  }
  if (!validBrief(S.current)) S.current = null;
  S.history = S.history.filter(validBrief);

  renderChips();
  setLevel(S.settings.level);
  if (S.current) {
    reelEls.forEach((r) => setReelRest(r, reelText(S.current, r.key)));
    renderCard(S.current);
  } else {
    reelEls.forEach((r) => {
      r.strip.style.transform = `translate3d(0, ${-itemHeight(r)}px, 0)`;
      updateReelLabel(r);
    });
  }
  renderHistory();

  // Перераховуємо позицію стрічок при зміні розміру (висота значення залежить від брейкпоінта)
  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => reelEls.forEach((r) => { if (!r.spinning) r.strip.style.transform = `translate3d(0, ${-itemHeight(r)}px, 0)`; }), 120);
  });

  /* Відкритий API для перевірок у консолі: SpinTheBrief.simulate(30) */
  window.SpinTheBrief = {
    simulate(n = 30) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const prev = S.current;
        const b = buildBrief(prev);
        b.wildcard = b._twist || null;
        delete b._twist;
        delete b._audienceUnlocked;
        commit(b, { isNew: true, prevBrief: prev });
        out.push(b);
      }
      renderCard(S.current); renderHistory();
      reelEls.forEach((r) => setReelRest(r, reelText(S.current, r.key)));
      return out;
    },
    state: () => S,
    instant: (on = true) => { instantMode = !!on; return instantMode; },
    /* Перевірка сумісності: SpinTheBrief.fits("web", "сторінка меню з цінами", "кафе, де …") */
    fits: (profId, formatName, nicheName) => formatFits(formatObj(profId, formatName), nicheTags({ text: nicheName })),
    /* Показати поп-ап клієнта для поточного брифу: SpinTheBrief.twist("messenger" | "call" | "email" | "voice") */
    twist(format) {
      if (!S.current) return "Спершу покрути барабани";
      openTwist(S.current.id, pickWildcard(S.current.niche, true), format);
      return "ok";
    },
  };
})();
