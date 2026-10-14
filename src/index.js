// iHost NS Panel Pro — index.js  v2.0
// Unifier v5.1 struktúrához igazítva:
//   payload.weather   → {temp, humidity, wind, gust, code, sunrise, sunset, tempMax, tempMin, forecast[]}
//   payload.ac        → {power, standby, offline, roomTemp, setTemp, mode}
//   payload.sensors   → {th:{nappali,halo,...}, switches:{...}, shutters:{...}}
//   payload.lights    → {bulbs:{...}, controllers:{...}}
'use strict';

const WX = {
    0: "☀️", 1: "🌤", 2: "⛅", 3: "🌥", 45: "🌫", 48: "🌫",
    51: "🌦", 53: "🌦", 55: "🌧", 61: "🌧", 63: "🌧", 65: "🌧",
    71: "🌨", 73: "🌨", 75: "❄️", 80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈", 99: "⛈"
};
const WX_NIGHT = { 0: "🌙", 1: "🌙", 2: "☁️", 3: "🌥" };

function wxIcon(code, timeStr) {
    if (timeStr) {
        const h = parseInt(timeStr.slice(11, 13), 10);
        if (h >= 20 || h < 6) return WX_NIGHT[code] || WX[code] || "🌡";
    }
    return WX[code] || "🌡";
}
function fmt2(n) { return String(n).padStart(2, "0"); }
function outdoorGlowCls(t) {
    if (t == null) return "g-mild";
    return t <= 5 ? "g-cold" : t <= 18 ? "g-mild" : "g-hot";
}
function tempCls(t) {
    if (t == null) return "tc-none";
    if (t >= 24) return "tc-hot";
    if (t >= 22) return "tc-warm";
    return "tc-norm";
}
function clothingHint(t) {
    if (t == null) return { ico: "❓", txt: "Ismeretlen" };
    if (t <= 0) return { ico: "🥶", txt: "Fagyos, vastag téli ruha" };
    if (t <= 5) return { ico: "🧥", txt: "Hideg, kabát szükséges" };
    if (t <= 10) return { ico: "🧥", txt: "Hűvös, kabát ajánlott" };
    if (t <= 18) return { ico: "🙂", txt: "Vedd fel a kabátod" };
    if (t <= 24) return { ico: "😊", txt: "Kellemes, könnyű öltözék" };
    return { ico: "☀️", txt: "Meleg, nyári ruha" };
}
function setClass(el, prefix, cls) {
    if (!el) return;
    el.classList.forEach(c => { if (c.startsWith(prefix)) el.classList.remove(c); });
    if (cls) el.classList.add(cls);
}

// ── SZEGMENS MAPPING ─────────────────────────────────────────
// sensors.switches[room][label] = true/false
const SEG_MAP = [
    { room: "eloszoba", label: "Kültér B", segId: "seg-kulter-0" },
    { room: "nappali", label: "Kültér A", segId: "seg-kulter-1" },
    { room: "eloszoba", label: "Előszoba", segId: "seg-nap-0" },
    { room: "eloszoba", label: "Étkező", segId: "seg-nap-1" },
    { room: "eloszoba", label: "Konyha", segId: "seg-nap-2" },
    { room: "nappali", label: "Nappali", segId: "seg-nap-3" },
    { room: "nappali", label: "Dolgozó", segId: "seg-nap-4" },
    { room: "halo", label: "Háló 1", segId: "seg-halo-0" },
    { room: "halo", label: "Háló 2", segId: "seg-halo-1" },
    { room: "gyerek", label: "Gyerekszoba", segId: "seg-gyerek-0" },
    { room: "furdo", label: "Fürdőszoba  világítás", segId: "seg-furdo-0" },
    { room: "wc", label: "WC világítás", segId: "seg-wc-0" },
];
const ZONE_SEGS = {
    kulter: ["seg-kulter-0", "seg-kulter-1"],
    nappali: ["seg-nap-0", "seg-nap-1", "seg-nap-2", "seg-nap-3", "seg-nap-4"],
    halo: ["seg-halo-0", "seg-halo-1"],
    gyerek: ["seg-gyerek-0"],
    furdo: ["seg-furdo-0"],
    wc: ["seg-wc-0"],
};
const CIRCUIT_MAP = {
    "Nappali fűtéskör": "nappali",
    "Hálószoba fűtéskör": "halo",
    "Gyerekszoba fűtéskör": "gyerek",
    "Fürdőszoba fűtéskör": "furdo",
    "WC fűtéskör": "wc",
};
const AC_MODES = { 1: "Fűtés", 2: "Hűtés", 3: "Ventilátor", 4: "Száraz", 8: "Auto" };

// ── ELEM REFERENCIÁK ──────────────────────────────────────────
const R = {};
function cacheRefs() {
    R.fcMin = document.getElementById("fc-min");
    R.fcMax = document.getElementById("fc-max");
    R.fcSunrise = document.getElementById("fc-sunrise");
    R.fcSunset = document.getElementById("fc-sunset");
    R.fc = [];
    for (let i = 0; i < 6; i++) {
        const el = document.getElementById("fc-" + i);
        R.fc.push(el ? {
            t: el.querySelector(".fc-t"),
            i: el.querySelector(".fc-i"),
            c: el.querySelector(".fc-c"),
            p: el.querySelector(".fc-p")
        } : null);
    }
    R.kulter = {
        card: document.getElementById("z-kulter"),
        temp: document.getElementById("z-kulter-temp"),
        rh: document.getElementById("z-kulter-rh"),
        hico: document.getElementById("z-kulter-hico"),
        htxt: document.getElementById("z-kulter-htxt"),
        wind: document.getElementById("z-kulter-wind"),
        gust: document.getElementById("z-kulter-gust"),
    };
    ["nappali", "halo", "gyerek", "furdo", "wc"].forEach(id => {
        R[id] = {
            card: document.getElementById("z-" + id),
            temp: document.getElementById("z-" + id + "-temp"),
            rh: document.getElementById("z-" + id + "-rh"),
            bat: document.getElementById("z-" + id + "-bat"),
        };
        if (id === "nappali") {
            R.nappali.kh = document.getElementById("z-nappali-kh");
            R.nappali.khico = document.getElementById("z-nappali-khico");
            R.nappali.khst = document.getElementById("z-nappali-khstate");
        }
    });
    R.segs = {};
    SEG_MAP.forEach(({ segId }) => { R.segs[segId] = document.getElementById(segId); });
}

// ── AKTÍV FŰTÉSZÓNÁK ─────────────────────────────────────────
function computeActiveZones(switches) {
    const futes = switches.futes || {};
    const boilerOn = futes["Kazán"] === true;
    const pumpOn = futes["Szivattyú"] === true;
    if (!boilerOn || !pumpOn) return [];
    return Object.entries(futes)
        .filter(([, state]) => state)
        .map(([label]) => CIRCUIT_MAP[label])
        .filter(Boolean);
}

// ── FŐFRISSÍTŐ ────────────────────────────────────────────────
function update(payload) {
    if (!payload) return;

    const w = payload.weather || {};
    const ac = payload.ac || {};
    const sensors = payload.sensors || {};
    const th = sensors.th || {};
    const switches = sensors.switches || {};
    const activeZones = computeActiveZones(switches);

    // Snapshot time (connection state is handled separately)
    if (payload._ts) {
        const d = new Date(payload._ts);
        const dot = document.getElementById("live-dot");
        const lu = document.getElementById("last-update");
        if (lu) lu.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(fmt2).join(":");
        if (dot) dot.classList.toggle("stale", (Date.now() - payload._ts) / 60000 > 10);
    }

    // Forecast
    const fc = Array.isArray(w.forecast) ? w.forecast : [];
    const fcTemps = fc.map(h => numeric(h.temp)).filter(t => t != null);
    if (R.fcMin) R.fcMin.textContent = fcTemps.length ? Math.min(...fcTemps).toFixed(1) + "°" : "—";
    if (R.fcMax) R.fcMax.textContent = fcTemps.length ? Math.max(...fcTemps).toFixed(1) + "°" : "—";
    if (R.fcSunrise) R.fcSunrise.textContent = w.sunrise || "—";
    if (R.fcSunset) R.fcSunset.textContent = w.sunset || "—";
    Array.from({ length: 6 }, (_, i) => fc[i] || {}).forEach((h, i) => {
        const r = R.fc[i]; if (!r) return;
        if (r.t) r.t.textContent = h.time ? h.time.slice(11, 16) : "—";
        if (r.i) r.i.textContent = wxIcon(h.code, h.time);
        if (r.c) r.c.textContent = h.temp != null ? numberText(h.temp) + "°" : "—";
        if (r.p) r.p.textContent = h.pop != null && h.pop > 0 ? h.pop + "%" : "";
    });

    // Szegmensek
    SEG_MAP.forEach(({ room, label, segId }) => {
        const seg = R.segs[segId]; if (!seg) return;
        seg.classList.toggle("on", (switches[room] || {})[label] === true);
    });
    Object.entries(ZONE_SEGS).forEach(([zid, segIds]) => {
        const card = document.getElementById("z-" + zid); if (!card) return;
        card.classList.toggle("any-on", segIds.some(sid => R.segs[sid]?.classList.contains("on")));
    });

    // Kültér
    {
        const temp = numeric(w.temp);
        const rz = R.kulter;
        const hint = clothingHint(temp);
        if (rz.temp) rz.temp.textContent = temp != null ? numberText(temp) + "°C" : "—";
        if (rz.rh) rz.rh.textContent = w.humidity != null ? w.humidity + "%" : "—";
        if (rz.hico) rz.hico.textContent = hint.ico;
        if (rz.htxt) rz.htxt.textContent = hint.txt;
        if (rz.wind) rz.wind.textContent = w.wind != null ? w.wind + " km/h" : "—";
        if (rz.gust) rz.gust.textContent = w.gust != null ? w.gust + " km/h" : "—";
        setClass(rz.card, "g-", outdoorGlowCls(temp));
    }

    // Belső zónák
    ["nappali", "halo", "gyerek", "furdo", "wc"].forEach(id => {
        const rz = R[id]; if (!rz?.card) return;
        const sensor = th[id] || {};
        const temp = numeric(sensor.temp);
        const rh = sensor.hum ?? null;
        const bat = sensor.battery ?? null;

        if (rz.temp) {
            rz.temp.textContent = temp != null ? numberText(temp) + "°C" : "—";
            setClass(rz.temp, "tc-", tempCls(temp));
        }
        if (rz.rh) rz.rh.textContent = rh != null ? rh + "%" : "—";
        if (rz.bat) {
            rz.bat.textContent = bat != null ? bat + "%" : "—";
            rz.bat.classList.toggle("mbat-low", bat != null && bat <= 20);
        }

        const isHeat = activeZones.includes(id);
        const isCool = id === "nappali" && ac.power === true && ac.offline !== true && Number(ac.mode) === 2;
        setClass(rz.card, "g-", isHeat ? "g-heat" : isCool ? "g-cool" : null);

        // Klíma hint (nappali)
        if (id === "nappali" && rz.kh) {
            const on = ac.power === true && ac.offline !== true;
            const m = Number(ac.mode);
            setClass(rz.kh, "kh-", on ? (m === 1 ? "kh-heat" : m === 2 ? "kh-cool" : null) : null);
            if (rz.khico) rz.khico.textContent = on ? (m === 1 ? "🔥" : m === 2 ? "❄️" : "≋") : "○";
            if (rz.khst) {
                const roomT = ac.roomTemp != null ? ac.roomTemp + "°C" : "—";
                rz.khst.textContent = on
                    ? `${AC_MODES[m] || "—"} · ${ac.setTemp ?? "—"}° · szoba ${roomT}`
                    : `${ac.offline === true ? "Nem elérhető" : typeof ac.power !== "boolean" ? "Nincs adat" : "Kikapcsolt"} · szoba ${roomT}`;
            }
        }
    });
}

// ── CLOCK ─────────────────────────────────────────────────────
const DAYS = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];
const MONTHS = ["január", "február", "március", "április", "május", "június",
    "július", "augusztus", "szeptember", "október", "november", "december"];
function updateClock() {
    const n = new Date();
    const cl = document.getElementById("clock");
    const dl = document.getElementById("dateline");
    if (cl) cl.textContent = fmt2(n.getHours()) + ":" + fmt2(n.getMinutes());
    if (dl) dl.textContent = `${n.getFullYear()}. ${MONTHS[n.getMonth()]} ${n.getDate()}., ${DAYS[n.getDay()]}`.toUpperCase();
}

// ── Connection and data freshness ──────────────────────────
function numeric(value) {
    if (value == null || value === '' || typeof value === 'boolean') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function numberText(value) {
    const n = numeric(value);
    return n === null ? '—' : n.toFixed(1);
}
const CACHE_KEY = 'nspanel-ui-v3:' + location.pathname;
const ROOM_IDS = ['nappali', 'halo', 'gyerek', 'furdo', 'wc'];
let lastPayload = null;
let lastReceived = 0;
let connected = false;
let waiting = true;
let cachedView = false;
let renderError = false;
let lastRequest = 0;
function isSnapshot(p) {
    return p && typeof p === 'object' && !Array.isArray(p) &&
        ['weather', 'sensors', 'ac'].some(k => Object.prototype.hasOwnProperty.call(p, k));
}
function old(ts, maxAge) {
    return !Number.isFinite(ts) || ts <= 0 || Date.now() - ts > maxAge || ts > Date.now() + 60000;
}
function paintStatus() {
    const staleTransport = old(lastReceived, 90000);
    const text = typeof uibuilder === 'undefined' ? 'UI könyvtár nem töltődött be' :
        renderError ? 'Adatformátum-hiba' : !connected ? 'Nincs kapcsolat' :
        waiting ? 'Adatokra vár…' : staleTransport ? 'Nincs új adat' : 'Kapcsolat rendben';
    document.getElementById('connection-status').textContent = text;
    document.getElementById('live-dot').classList.toggle('stale', !connected || waiting || staleTransport || renderError);
    if (!lastPayload) return;
    const stamps = lastPayload._updated || {};
    ROOM_IDS.forEach(id => {
        const sensor = ((lastPayload.sensors || {}).th || {})[id] || {};
        const offline = sensor.online === false;
        const stale = cachedView || old((stamps.th || {})[id], 120000);
        R[id].card.classList.toggle('data-stale', stale);
        R[id].card.classList.toggle('data-offline', offline);
        document.getElementById('note-' + id).textContent = offline ? 'Szenzor nem elérhető' :
            cachedView ? 'Mentett adat' : stale ? 'Régi / nem igazolt adat' : '';
    });
    R.kulter.card.classList.toggle('data-stale', cachedView || old(stamps.weather, 35 * 60000));
    const relayStamps = (stamps.switches || {}).futes || {};
    const relaysFresh = !cachedView && ['Kazán', 'Szivattyú', ...Object.keys(CIRCUIT_MAP)]
        .every(label => !old(relayStamps[label], 120000));
    const switches = (lastPayload.sensors || {}).switches || {};
    const heat = switches.futes || {};
    const bar = document.getElementById('heating-status');
    const relayText = key => heat[key] === true ? 'be' : heat[key] === false ? 'ki' : '?';
    const circuits = Object.keys(CIRCUIT_MAP);
    const open = circuits.filter(k => heat[k] === true).length;
    const allKnown = circuits.every(k => typeof heat[k] === 'boolean');
    bar.textContent = relaysFresh ? `Kazán: ${relayText('Kazán')} · Szivattyú: ${relayText('Szivattyú')} · Nyitott kör: ${open}${allKnown ? '' : '/?'}` :
        'Fűtés: nincs friss reléadat';
    bar.classList.toggle('active', relaysFresh && heat['Kazán'] === true && heat['Szivattyú'] === true);
    if (!relaysFresh) ROOM_IDS.forEach(id => R[id].card.classList.remove('g-heat'));
    if (cachedView || old(stamps.ac, 35 * 60000)) {
        R.nappali.card.classList.remove('g-cool');
        setClass(R.nappali.kh, 'kh-', null);
        R.nappali.khst.textContent = 'Nincs friss klímaadat';
        R.nappali.khico.textContent = '○';
    }
    SEG_MAP.forEach(({room, label, segId}) => {
        const stale = cachedView || old(((stamps.switches || {})[room] || {})[label], 120000);
        R.segs[segId].classList.toggle('unknown', stale);
        if (stale) R.segs[segId].classList.remove('on');
    });
    Object.entries(ZONE_SEGS).forEach(([id, segs]) => {
        document.getElementById('z-' + id).classList.toggle('any-on', segs.some(s => R.segs[s].classList.contains('on')));
    });
    const ts = numeric(lastPayload._ts);
    document.getElementById('last-update').textContent = ts ?
        (cachedView ? 'Mentett: ' : 'Adat: ') + new Date(ts).toLocaleTimeString('hu-HU') : 'Időpont ismeretlen';
}
function requestState() {
    if (typeof uibuilder === 'undefined' || !connected || Date.now() - lastRequest < 1500) return;
    lastRequest = Date.now();
    try { uibuilder.send({ topic: 'ui/state/request' }); }
    catch (e) { console.warn('UI állapotlekérés sikertelen', e); }
}
function receive(msg) {
    if (!msg || !isSnapshot(msg.payload)) return;
    try {
        update(msg.payload);
        lastPayload = msg.payload;
        lastReceived = Date.now();
        cachedView = false;
        waiting = false;
        renderError = false;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(lastPayload)); } catch (_) { /* storage optional */ }
    } catch (e) {
        renderError = true;
        console.error('UI adatfeldolgozási hiba', e);
    }
    paintStatus();
}
cacheRefs();
ROOM_IDS.forEach(id => {
    const note = document.createElement('div');
    note.id = 'note-' + id;
    note.className = 'sensor-note';
    R[id].card.appendChild(note);
});
updateClock();
try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (isSnapshot(saved) && !old(numeric(saved._ts), 24 * 60 * 60000)) {
        update(saved);
        lastPayload = saved;
        cachedView = true;
    }
} catch (_) { /* corrupted or unavailable browser cache is not fatal */ }
document.getElementById('refresh-state').addEventListener('click', () => { waiting = true; requestState(); paintStatus(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { requestState(); paintStatus(); } });
window.addEventListener('online', requestState);
if (typeof uibuilder !== 'undefined') {
    // The supplied v7.5 IIFE starts automatically. Register handlers, then read current state.
    uibuilder.onChange('msg', receive);
    uibuilder.onChange('ioConnected', value => {
        connected = value === true;
        waiting = true;
        if (connected) requestState();
        paintStatus();
    });
    connected = uibuilder.get('ioConnected') === true;
    const existing = uibuilder.get('msg');
    if (existing) receive(existing);
    if (connected) requestState();
}
paintStatus();
setInterval(() => {
    updateClock();
    paintStatus();
    // Retry an empty initial state, and verify the channel periodically after recovery.
    if (waiting || old(lastReceived, 60000)) requestState();
}, 10000);
