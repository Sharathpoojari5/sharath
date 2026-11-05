# Namma Karkala

A free, GTA-style open-world browser game set in Karkala (Udupi district), built from real
OpenStreetMap data. Ride Ajja's old scooter, drive a private bus, dodge cows, run deliveries
in the rain and climb Bahubali Betta. Inspired by the Bengaluru fan game *Benglooru*; this is
an independent game with its own code, models and writing.

## Play locally

    cd namma-karkala
    python3 -m http.server 8000        # then open http://localhost:8000

Best on a laptop with a keyboard (Chrome, Edge, Safari or Firefox).

## Publish free on Cloudflare Pages (from the repo root)

    npx wrangler pages deploy namma-karkala --project-name namma-karkala --branch main

## What's in it

| | |
|---|---|
| **The town** | Real Karkala road network (OpenStreetMap), squeezed to 55% so it fits a game: Bahubali Betta with the Gomateshwara statue, Ramasamudra and Aanekere (with the basadi in the lake), Chaturmukha Basadi, Venkataramana Temple, the bus stand, Market Road stalls, Gandhi Maidan, Bhuvanendra College, the police station. ~1,600 procedural houses and shops with Mangalore-tile roofs, ~4,000 coconut and mango trees, street lights. |
| **Story** | Six missions: *Welcome Home*, *Goli Baje Express*, *Conductor Saab*, *The Mallige Thief*, *Kere Evening*, *Bahubali Calling*. |
| **Side jobs (J)** | Oota Express deliveries on two-wheelers, auto-meter fares in autos and cars, bus rounds. Rain pays 30% extra. |
| **Vehicles** | Scooter, motorbike, auto rickshaw, car, tempo, private bus (named like film heroes), police jeep. Every one is drivable. Traffic drives on the left. |
| **The street** | Pedestrians who shout at you in Kannada, cows that block the road, honking traffic. |
| **Wanted meter** | Gossip → Fine → Jeep chase → Checkpost → Front page. Police jeeps chase you from 2 stars. |
| **World** | Day/night cycle (1 real second = 1 game minute), Karkala's frequent rain, wet roads, night lights. |
| **Extras** | Photo mode (O, Enter saves a PNG), big map (M), cheats, progress saved in the browser. |

## Controls

`WASD` walk/drive · `Shift` run · mouse look · `F` get on/off · `H` horn · `Space` jump/handbrake ·
`J` side job · `M` map · `O` photo · `C` camera distance · `Esc` pause.

## Cheats (type while playing)

`BARSA` rain · `SURYA` clear sky · `IRULU` night · `BELAKU` morning · `PAISA` money ·
`POLICEILLA` clear wanted · `GOLIBAJE` health · `BAHUBALI` moon jump · `JORR` super sprint ·
`BUSBEKU` / `AUTOBEKU` / `BULLET` spawn a bus / auto / bike.

## Files

| Path | What |
|---|---|
| `index.html` | page, HUD and menus |
| `js/main.js` | loading screen and boot |
| `js/game.js` | loop, camera, input, missions, jobs, police, weather, HUD, saving |
| `js/world.js` | builds the town from the map data; collisions, roads, places |
| `js/actors.js` | player, vehicles and traffic AI, pedestrians, cows |
| `js/models.js` | procedural low-poly models (vehicles, people, statue, temples, bus stand) |
| `js/audio.js` | all sound, synthesised (no audio files) |
| `data/karkala.json` | processed map (roads, lakes, landmarks) |
| `tools/build_map.py` | rebuilds `data/karkala.json` from an OpenStreetMap `map.json` export |

## Credits

* Map data © OpenStreetMap contributors, available under the ODbL.
* three.js (MIT), see `js/THREE_LICENSE`.
* Shops, buses and characters are fictional or parodies.
