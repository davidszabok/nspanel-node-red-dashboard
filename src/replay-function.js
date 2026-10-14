// UI-only snapshot replay. Never trigger HVAC or refresh stored timestamps.
const request = msg.topic === 'ui/state/request' ||
    ['client connect', 'ready for content'].includes(msg.uibuilderCtrl) ||
    msg.cacheControl === 'REPLAY';
if (!request || typeof msg._socketId !== 'string' || !msg._socketId) return null;
const s = global.get('dash_state');
if (!s) return { topic: 'ui/state/wait', _socketId: msg._socketId, payload: null };
const payload = {};
for (const key of ['weather','ac','sensors','lights','gateway','motion','_ts','_updated']) {
    if (s[key] !== undefined) payload[key] = s[key];
}
return { topic: 'ui/state', _socketId: msg._socketId,
    payload: JSON.parse(JSON.stringify(payload)) };