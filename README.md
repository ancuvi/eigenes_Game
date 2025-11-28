# Ascension of the Slime (Canvas Prototype)

Ein kleines Canvas-Click-Movement-RPG mit automatisch spawnenden Gegnern, Auto-Kampf und Weltkarten-Overlay.

## Steuerung & Ablauf
- Klicken/Tap auf Boden: Slime läuft zum Punkt.
- Klicken/Tap auf Gegner: Slime läuft hin und kämpft.
- Wird der Slime von einem Gegner getroffen, kontert er automatisch und verfolgt den Angreifer (Auto-Aggro).
- Gegner bemerken den Spieler in ~200px, verfolgen ihn und greifen in Nahdistanz an; Leash bei ~450px.
- Raumwechsel über die Pfeil-Overlays (nur wenn Raum leer).
- Tod: HP=0 → Reset auf Startwerte, Gold=0, neues Grid, frische Gegner.
- Map-Button oben links öffnet Weltkarten-Overlay mit allen besuchten Räumen; aktueller Raum grün.

## Dateien & Rollen
- `index.html` – Canvas, Stats, Nav-Pfeile, Combat-Log, Map-Overlay-UI.
- `style.css` – Layout/Overlays/Map-Dialog.
- `js/main.js` – Game-Loop, Init, Raumwechsel, Death-Reset, Map-Overlay-Anbindung.
- `js/player.js` – Stats, Movement, Auto-Kampf/Auto-Aggro, Level/Gold/EXP-Handling.
- `js/enemy.js` – Gegner-Stats, Aggro/Follow/Leash, Angriffe.
- `js/map.js` – Raum-Grid, gewichteter Spawn (1–3 Gegner), Besuchsstatus, Room-Switch-Spawnpos.
- `js/mapOverlay.js` – Weltkarten-Overlay-Zeichnung und Öffnen/Schließen.
- `js/input.js` – Maus/Touch auf Canvas, Click-to-move/-fight.
- `js/renderer.js` – Canvas-Rendering (Grid, Player/Enemy Sprites, HP-Balken, Labels).
- `js/ui.js` – UI-Updates (Stats, Combat-Log) mit Safe-Checks.
- `js/utils.js` – Helpers (Random, Distanz, Kollisionschecks, Sleep).
- `js/combat.js` – Ältere/tickbasierte Combat-Logik (derzeit nicht im Loop genutzt, Referenz).

## Spiellogik im Kurzabriss
- Gegner-Spawn pro Raum: 60% ein Gegner, 30% zwei, 10% drei; Level steigt mit Distanz vom Start.
- Player-InteraktionRange ~60px; Gegner-AngriffRange ~60px.
- EXP/Gold bei Kill; Spieler-Levelup auf 100 EXP: mehr HP & Damage, volle Heilung.
- Reset setzt Player-Basiswerte, leert Grid und lädt Start-Raum neu.

## Starten
Einfach `index.html` im Browser öffnen (lokal reicht). Keine Build-Tools nötig. Cursor/Touch auf Canvas für Bewegung/Kampf nutzen; Map-Button für Weltkarte.***
PWA: `manifest.json` ist verlinkt, Apple-Web-App-Meta-Tags sind gesetzt; Icons liegen unter `icons/`. Auf Mobile „Zum Home-Bildschirm hinzufügen“, um im Vollbild zu starten.
