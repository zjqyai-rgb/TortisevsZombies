# 🐢 Turtles vs Zombies

A Plants-vs-Zombies-style lane defence game with tortoises and sea turtles. It runs in the browser with no dependencies and no image files; all art is drawn in code.

## Run
Open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8123
```
Then open http://localhost:8123

## Structure
- `js/data.js`: turtle and zombie stats, the 10 level definitions, and the wave/spawn schedule generator
- `js/render.js`: all procedural drawing (backgrounds, turtles, zombies, crabs, effects)
- `js/game.js`: game loop, combat, input, menus, almanac, save progress (localStorage)
- `js/audio.js`: synthesized sound effects (Web Audio)

To tune difficulty, edit the `LEVELS` array in `js/data.js`. Each level sets its zombie count, flag waves, spawn interval, zombie mix, HP multiplier and bosses.
