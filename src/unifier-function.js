// ════════════════════════════════════════════════════════════
//  == FUNCTION NODE: UNIFIER v5.4 ==
//  Változás v5.3-hoz képest:
//  - "gateway" típus kezelése: DIRIGERA HUB adatok (nextSunSet, nextSunRise, homestate)
//  - "motion" típus kezelése: mozgásérzékelő (detected, room, battery)
//  Új state ágak: state.gateway, state.motion
// ════════════════════════════════════════════════════════════

function quickHash(obj) {
    const s = JSON.stringify(obj);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
}

function getState() {
    const s = global.get("dash_state") || {};
    if (!s.weather)  s.weather = null;
    if (!s.ac)       s.ac = null;
    if (!s.sensors)  s.sensors = {};
    if (!s.sensors.th)       s.sensors.th = {};
    if (!s.sensors.switches) s.sensors.switches = {};
    if (!s.sensors.shutters) s.sensors.shutters = {};
    if (!s.lights)   s.lights = {};
    if (!s.lights.bulbs)       s.lights.bulbs = {};
    if (!s.lights.controllers) s.lights.controllers = {};
    if (!s.gateway)  s.gateway = null;   // ÚJ: DIRIGERA HUB
    if (!s.motion)   s.motion = {};      // ÚJ: mozgásérzékelők
    if (!s._hash)    s._hash = null;
    return s;
}

// ── Sonoff mapping ───────────────────────────────────────────
const SONOFF_FOR_LIGHT = {
    "nappali":          [{ room: "nappali",  label: "Nappali" }],
    "lego_vitrin":      [{ room: "nappali",  label: "Dolgozó" }],
    "dolgozo_spot_1":   [{ room: "nappali",  label: "Dolgozó" }],
    "dolgozo_spot_2":   [{ room: "nappali",  label: "Dolgozó" }],
    "dolgozo_spot_3":   [{ room: "nappali",  label: "Dolgozó" }],
    "konyha_spot_1":    [{ room: "eloszoba", label: "Konyha" }],
    "konyha_spot_2":    [{ room: "eloszoba", label: "Konyha" }],
    "konyha_spot_3":    [{ room: "eloszoba", label: "Konyha" }],
    "konyha_spot_4":    [{ room: "eloszoba", label: "Konyha" }],
    "konyhabutor":      [{ room: "eloszoba", label: "Konyha" }],
    "konyhabutor_fiok": [{ room: "eloszoba", label: "Konyha" }],
    "halo_01":          [{ room: "halo",     label: "Háló 1" }, { room: "halo", label: "Háló 2" }],
    "halo_02":          [{ room: "halo",     label: "Háló 1" }, { room: "halo", label: "Háló 2" }],
    "gyerek":           [{ room: "gyerek",   label: "Gyerekszoba" }],
    "eloszoba_bulb_1":  [{ room: "eloszoba", label: "Előszoba" }],
    "eloszoba_bulb_2":  [{ room: "eloszoba", label: "Előszoba" }],
    "eloszoba_bulb_3":  [{ room: "eloszoba", label: "Előszoba" }],
    "technika":         []   // folyamatos áram
};

function isSonoffOn(sonoffList, switchMap) {
    if (sonoffList.length === 0) return true;
    return sonoffList.some(sw => switchMap[sw.room] && switchMap[sw.room][sw.label] === true);
}

// ════════════════════════════════════════════════════════════
//  FŐLOGIKA
// ════════════════════════════════════════════════════════════
const state = getState();
const p = msg.payload;
const receivedAt = Date.now();
state._updated = state._updated || {};
state._updated.th = state._updated.th || {};
state._updated.switches = state._updated.switches || {};

if (p && !Array.isArray(p) && p.type === "weather") {
    const { type, ...data } = p;
    state.weather = data;
    state._updated.weather = receivedAt;
}
else if (p && !Array.isArray(p) && p.type === "ac") {
    const { type, ...data } = p;
    state.ac = data;
    state._updated.ac = receivedAt;
}
else if (Array.isArray(p)) {
    const items = p.flatMap(x => Array.isArray(x) ? x : [x]);

    items.forEach(item => {
        if (!item || !item.type) return;

        switch (item.type) {

            case "th":
                state._updated.th[item.room] = receivedAt;
                state.sensors.th[item.room] = {
                    temp:    item.temp,
                    hum:     item.hum,
                    battery: item.battery,
                    online:  item.online
                };
                break;

            case "switch":
                state._updated.switches[item.room] = state._updated.switches[item.room] || {};
                state._updated.switches[item.room][item.label] = receivedAt;
                if (!state.sensors.switches[item.room]) state.sensors.switches[item.room] = {};
                state.sensors.switches[item.room][item.label] = item.state;
                break;

            case "shutter": {
                if (!state.sensors.shutters[item.room]) state.sensors.shutters[item.room] = {};
                const prev = state.sensors.shutters[item.room][item.label] || {};
                state.sensors.shutters[item.room][item.label] = {
                    pct:   (item.pct   != null) ? item.pct   : (prev.pct   ?? null),
                    motor: (item.motor != null) ? item.motor : (prev.motor ?? null)
                };
                break;
            }

            case "light": {
                const sonoffList = SONOFF_FOR_LIGHT[item.label] ?? null;
                const sonoffOn = sonoffList === null
                    ? item.reachable
                    : isSonoffOn(sonoffList, state.sensors.switches);
                const isOn = sonoffOn && item.reachable === true && item.on === true;

                if (!state.lights.bulbs[item.room]) state.lights.bulbs[item.room] = {};
                state.lights.bulbs[item.room][item.label] = {
                    on:        isOn,
                    level:     item.level,
                    reachable: item.reachable,
                    sonoffOn:  sonoffOn,
                    ...(item.hue !== undefined ? { hue: item.hue, sat: item.sat, ct: item.ct } : {})
                };
                break;
            }

            case "controller":
                state.lights.controllers[item.label] = {
                    battery:   item.battery,
                    reachable: item.reachable
                };
                break;

            // ── ÚJ: DIRIGERA HUB ────────────────────────────
            case "gateway":
                state.gateway = {
                    reachable:        item.reachable,
                    backendConnected: item.backendConnected,
                    homestate:        item.homestate,
                    nextSunSet:       item.nextSunSet,
                    nextSunRise:      item.nextSunRise,
                    timezone:         item.timezone,
                    firmwareVersion:  item.firmwareVersion
                };
                break;

            // ── ÚJ: MOZGÁSÉRZÉKELŐ ──────────────────────────
            case "motion": {
                // room-kulcs: a dirigera "Technika" szobanévből → "technika"
                const roomKey = (item.room || item.label || "unknown")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();
                state.motion[roomKey] = {
                    detected:  item.detected,
                    reachable: item.reachable,
                    battery:   item.battery,
                    label:     item.label
                };
                break;
            }
        }
    });
}

const newHash = quickHash({
    w: state.weather,
    a: state.ac,
    s: state.sensors,
    l: state.lights,
    g: state.gateway,
    m: state.motion
});

if (!msg.injected && newHash === state._hash) return null;

state._hash = newHash;
state._ts = receivedAt;
global.set("dash_state", state);

return {
    payload: {
        weather: state.weather,
        ac:      state.ac,
        sensors: state.sensors,
        lights:  state.lights,
        gateway: state.gateway,
        motion:  state.motion,
        _ts:     state._ts,
        _updated: state._updated
    }
};
