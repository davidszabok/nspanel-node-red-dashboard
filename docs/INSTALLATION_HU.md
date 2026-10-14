# Telepítés, bekötés és helyszíni próba

## Előfeltételek

- működő Node-RED;
- `node-red-contrib-uibuilder` 7.x (az archív rendszerben 7.7.4);
- egy normalizált állapotot előállító Unifier Function;
- a panel által elérhető Node-RED/UIBUILDER hálózati végpont.

## Ajánlott kézi telepítés

1. Exportáld a teljes jelenlegi flow-t.
2. Mentsd el mindkét UIBUILDER példány eredeti `index.html`, `index.css` és `index.js` fájlját.
3. A meglévő Unifier Function node-ban cseréld a Function törzsét a `src/unifier-function.js` teljes tartalmára. A kimeneti bekötéseket hagyd meg.
4. Hozz létre két külön, egykimenetes Function node-ot. Mindkettőbe másold a `src/replay-function.js` tartalmát.
5. Az `nscompact` UIBUILDER node kapcsolat-/kliensüzenet kimeneteit kösd az első replay Function bemenetére, annak kimenetét pedig vissza ugyanennek az UIBUILDER node-nak a bemenetére.
6. Az `nsdesktop2` node-nál ismételd meg ugyanezt a második replay Functionnel. A két replay kimenetét ne kösd össze.
7. Mindkét használt UIBUILDER példány `src` könyvtárában cseréld az `index.html`, `index.css` és `index.js` fájlokat.
8. Deploy után töltsd újra a panel oldalát a böngészőcache megkerülésével.

## Részleges export használata

A `src/ui-flow-patch.json` három frissítendő és két hozzáadandó node-ot tartalmaz. Ez nem teljes flow és nem önállóan importálandó rendszer. Csak akkor használd, ha az importáló egyértelműen a meglévő node-ok frissítését kínálja. Duplikált UIBUILDER URL-ek vagy megváltozott node-azonosítók esetén használd a kézi módszert.

A patchben szereplő `192.0.2.10` dokumentációs mintacím. Nem működő helyi cím, és publikációs biztonságból került az eredeti cím helyére.

## A replay működése

- A kliens induláskor, újracsatlakozáskor, előtérbe kerüléskor és a frissítőgombbal állapotot kér.
- Üres induláskor 10 másodpercenként újrapróbálkozik.
- Ha egy percig nincs új üzenet, ismét állapotot kér.
- A replay kizárólag a kérő `_socketId` címére és az adott UIBUILDER node-ra válaszol.
- A kapcsolatvezérlő mezőket eltávolítja, így nem keletkezik üzenethurok.
- A visszaküldés csak olvasás; nem indít HVAC- vagy eszközparancsot.

## Frissességi szabályok

- hőmérők és kapcsolócsatornák: 2 perc után elavult;
- időjárás és klíma: 35 perc után elavult;
- böngészőben tárolt állapot: legfeljebb 24 óráig használható, „Mentett adat” jelzéssel;
- tárolt reléállapotból a felület nem állít aktív fűtést friss visszajelzés nélkül.

## Helyszíni próba

1. Működő Node-RED mellett csak a panelt indítsd újra. Az utolsó szerverállapotnak új szenzorváltozás nélkül is meg kell jelennie.
2. Szakítsd meg, majd állítsd helyre a panel hálózatát. Jelenjen meg kapcsolatvesztés, majd automatikus helyreállás.
3. Próbáld ki azt a sorrendet is, amikor előbb a panel, később a Node-RED/iHost válik elérhetővé.
4. Állíts le tesztben egy szenzorfrissítést. A többi adat érkezése mellett is jelenjen meg az elavult jelzés.
5. Ellenőrizd a 480×480-as nézetet, a görgetést, a frissítőgombot és a hosszabb magyar feliratokat.
6. Böngészőkonzolban ne legyen nem kezelt kivétel vagy ismétlődő reconnect-hurok.

## Hibakeresés

| Jelzés | Ellenőrzés |
|---|---|
| „UI könyvtár nem töltődött be” | a `./uibuilder.iife.min.js` elérhetősége az oldalhoz képest |
| „Nincs kapcsolat” | Socket.IO/UIBUILDER kapcsolat, proxy, TLS és hálózat |
| „Adatformátum-hiba” | böngészőkonzol és a `DATA_CONTRACT_HU.md` szerinti payload |
| üres képernyő | Unifier kimenet, replay bekötés, UIBUILDER URL, JavaScript-hiba |
| régi érték nem jelölődik | `_updated` időbélyegek és periodikus kliensoldali frissességvizsgálat |

## Visszaállítás

Tedd vissza a három eredeti UI-fájlt és az eredeti Unifier Function törzset, majd töröld a két hozzáadott replay Function node-ot és vezetékeiket. Deploy után végezz cache-t megkerülő újratöltést.
