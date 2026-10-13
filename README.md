# 🐢 Turtles vs Zombies

A Plants-vs-Zombies-style lane defence game with tortoises and sea turtles. It runs in the browser with no dependencies and no image files; all art is drawn in code.

### ▶ [Play it now: tortisevszombies.vercel.app](https://tortisevszombies.vercel.app)

Works on desktop and phones (best in landscape).

- 20 levels across 4 worlds: Seaside, Underwater Reef, Moonlit Shore and Abyssal Trench, ending with the Kraken King boss
- 12 turtles to unlock and 13 zombie types
- 1x/2x/3x game speed; progress is saved in your browser

## Run
Open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8123
```
Then open http://localhost:8123

## Structure
- `js/data.js`: turtle and zombie stats, the 20 level definitions, and the wave/spawn schedule generator
- `js/render.js`: all procedural drawing (backgrounds, turtles, zombies, crabs, effects)
- `js/game.js`: game loop, combat, input, menus, almanac, save progress (localStorage)
- `js/audio.js`: synthesized sound effects (Web Audio)

To tune difficulty, edit the `LEVELS` array in `js/data.js`. Each level sets its zombie count, flag waves, spawn interval, zombie mix, HP multiplier and bosses.
