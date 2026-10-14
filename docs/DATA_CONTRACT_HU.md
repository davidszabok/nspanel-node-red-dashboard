# UI adatkontraktus

Az Unifier egyetlen normalizált payloadot küld a klienseknek. A mezők hiányozhatnak vagy lehetnek `null` értékűek; a kliensnek ezt hiba nélkül kell kezelnie.

```json
{
  "_ts": 1730000000000,
  "_updated": {
    "weather": 1730000000000,
    "ac": 1730000000000,
    "th": {
      "nappali": 1730000000000
    },
    "switches": {
      "futes": {
        "Kazán": 1730000000000
      }
    }
  },
  "weather": {
    "temp": 9.4,
    "humidity": 74,
    "wind": 12,
    "gust": 21,
    "sunrise": "06:42",
    "sunset": "18:21",
    "forecast": []
  },
  "ac": {
    "power": true,
    "mode": 1,
    "roomTemp": 22.1,
    "setTemp": 23,
    "offline": false
  },
  "sensors": {
    "th": {
      "nappali": {
        "temp": 23.2,
        "hum": 48,
        "battery": 91,
        "online": true
      }
    },
    "switches": {
      "futes": {
        "Kazán": true,
        "Szivattyú": true,
        "Nappali fűtéskör": true
      }
    },
    "shutters": {
      "nappali": {
        "Nappali redőny I": {
          "pct": 50,
          "motor": "stopped"
        }
      }
    }
  },
  "lights": {
    "bulbs": {},
    "controllers": {}
  },
  "gateway": {},
  "motion": {}
}
```

## Frissesség

Az `_ts` a teljes összesített állapot utolsó kiküldési ideje. A részletes frissességhez az `_updated` mező ágankénti időbélyegeit kell használni. Egy friss lámpaüzenet nem frissítheti egy régi hőmérséklet vagy relécsatorna időbélyegét.

## Kliens → Node-RED kérés

A kliens az UIBUILDER kapcsolaton állapotkérést küld. A pontos mezőket az `index.js` és `replay-function.js` együtt definiálja. A Node-RED oldal a kéréshez tartozó `_socketId` alapján célzott választ ad; broadcast replay nem készül.

## Kompatibilitási szabályok

- A hőmérséklet és páratartalom lehet szám vagy számmá alakítható szöveg.
- Ismeretlen, hiányzó vagy nem véges számérték nem szakíthatja meg a renderelést.
- A rövidebb új előrejelzés után a korábbi felesleges cellákat törölni kell.
- Az `online: false` külön offline jelzést eredményez.
- A kapcsolatjelző csak a böngésző–Node-RED kapcsolatot jelzi, nem minden fizikai adatforrás frissességét.
