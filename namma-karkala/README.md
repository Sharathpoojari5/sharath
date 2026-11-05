# Namma Karkala

A free, GTA-style open-world browser game set in Karkala (Udupi district), built from real
OpenStreetMap data. Ride Ajja's old scooter, drive a private bus, dodge cows, run deliveries
in the rain and climb Bahubali Betta. Inspired by the Bengaluru fan game *Benglooru*; this is
an independent game with its own code, models and writing.

## Play locally

    cd namma-karkala
    python3 -m http.server 8000        # site at http://localhost:8000, game at http://localhost:8000/play/

Best on a laptop with a keyboard (Chrome, Edge, Safari or Firefox).

## Publish free on Cloudflare Pages (from the repo root)

    npx wrangler pages deploy namma-karkala --project-name namma-karkala --branch production

The folder is the whole site: `/` is the landing page (trailer, shows, radio with song previews, tindi menu, forms), `/play/` is the game,
plus `/how-to-play/`, `/credits/` and `/privacy/`. After the first deploy, replace `https://namma-karkala.pages.dev` in the meta tags,
`sitemap.xml` and `robots.txt` if your address is different:

    grep -rl "namma-karkala.pages.dev" namma-karkala --include=*.html --include=*.xml --include=*.txt

The vote and bug forms keep answers on the visitor's device until you set `<meta name="form-endpoint" content="https://...">` in `index.html`
to a form inbox (for example a Formspree or Cloudflare Worker URL that accepts JSON POSTs).

## What's in it

| | |
|---|---|
| **The town** | Real Karkala road network (OpenStreetMap), squeezed to 55% so it fits a game: Bahubali Betta with a sculpted Gommata (kayotsarga pose, creepers, anthills, lotus pedestal) inside a stone enclosure, Ramasamudra and Aanekere (with the basadi in the lake), Chaturmukha Basadi, Venkataramana Temple, the bus stand, Market Road stalls, Gandhi Maidan, Bhuvanendra College, the police station. ~1,600 procedural houses and shops: Mangalore-tile roofs, windows that light up at night, balconies, black water tanks, compound walls, verandas, shop signboards. Coconut and areca palms, banana plants, mango trees. Laterite road shoulders, black-and-yellow kerbs, electric poles with wires, bus shelters, flex banners, a petrol bunk, clouds and rippling kere water. |
| **Story** | Six missions: *Welcome Home*, *Goli Baje Express*, *Conductor Saab*, *The Mallige Thief*, *Kere Evening*, *Bahubali Calling*. |
| **Side jobs (J)** | Oota Express deliveries on two-wheelers, auto-meter fares in autos and cars, bus rounds. Rain pays 30% extra. |
| **Vehicles** | Bicycle, scooter, motorbike, auto rickshaw, car, Omni van, SUV, tempo, lorry (HORN OK PLEASE), water tanker, tractor, 108 ambulance, private bus, state bus, school bus, police jeep. Spinning wheels, KA-20 number plates. Every one is drivable. Traffic drives on the left. |
| **The street** | Pedestrians who shout at you in Kannada, cows that block the road, honking traffic. |
| **Wanted meter** | Gossip → Fine → Jeep chase → Checkpost → Front page. Police jeeps chase you from 2 stars. |
| **World** | Day/night cycle (1 real second = 1 game minute), Karkala's frequent rain, wet roads, night lights. |
| **Music & radio** | Ten original tracks composed in code (no samples, no licences, nothing to download): chenda/dollu/tassa percussion, nadaswaram, harmonium, tabla, supersaw drops, Tulunadu-flavoured ragas. A score follows the game (theme by day, *Kere Sandhye* at night and in rain, *Tiger Drop* in a chase, *Bahubali Betta* at the end). Get into any vehicle with a cab and the radio comes on: **Radio Karkala 91.1** (Tulu folk fusion), **Pili Beats FM** (tiger-dance bass), **Sandalwood Retro** (golden Kannada), **Kere FM** (lake-side chill). `R` changes station. Song lyrics show on screen in Kannada, Tulu or English. |
| **Tulunadu live** | Four shows on their own hours, each with performers, a crowd, lights and music that swells as you approach: **Pili Vesha** (painted tigers, tasa and chende, Swaraj Maidan), **Yakshagana** (stage, crowned dancers, bhagavatha and drummers, Gandhi Maidan), **Bhajane** (circle round a brass lamp, harmonium, tabla, jhanj, near the Hanuman Temple) and **Kordha Tukatta Kambala** (twin-buffalo mud race with scoreboard, beside Aanekere). |
| **Songs with words** | Every track has a sung lyric line (Tulu, Kannada or English) from a small formant singer, shown on screen. Songs: Tulunadu folk fusion, Pili bass, Sandalwood retro, lake-side chill, Hari Om bhajane, Yakshagana ranga pravesha, Koti Chennaya paddana, and the Bahubali theme. Five radio stations in any vehicle with a cab. |
| **Tindi** | Counters at tiffin hotels, lunch homes and street carts: idli sambar, medu vada, goli baje, masala dosa, neer dosa, Mangalore buns, filter coffee, meals, kori rotti, pathrode, fish fry, pundi gassi. Press F, pick a number. |
| **Street talk** | Pairs of neighbours chat in speech bubbles in a Hinglish, Kannada and Tulu mix. Drive down the middle of the road, nearly hit someone, block traffic or spam the horn and drivers and pedestrians shout back. |
| **Extras** | Photo mode (O, Enter saves a PNG), big map (M), cheats, progress saved in the browser. |

## Controls

`WASD` walk/drive · `Shift` run · mouse look · `F` get on/off · `H` horn · `Space` jump/handbrake ·
`R` radio station · `J` side job · `M` map · `O` photo · `C` camera distance · `Esc` pause.

## Cheats (type while playing)

`BARSA` rain · `SURYA` clear sky · `IRULU` night · `BELAKU` morning · `PAISA` money ·
`POLICEILLA` clear wanted · `GOLIBAJE` health · `BAHUBALI` moon jump · `JORR` super sprint ·
`BUSBEKU` / `AUTOBEKU` / `BULLET` / `LORRY` / `TRACTOR` / `AMBULANCE` / `CYCLE` / `KSRTC` spawn that vehicle.

## Files

| Path | What |
|---|---|
| `index.html` | landing page |
| `play/index.html` | the game page: HUD and menus |
| `css/site.css`, `js/site.js`, `js/radio-data.js` | landing page styles, behaviour and radio preview data |
| `brand/` | logo, favicon, social image |
| `media/`, `audio/` | landing page images, trailer and 8 song previews |
| `js/main.js` | loading screen and boot |
| `js/game.js` | loop, camera, input, missions, jobs, police, weather, HUD, saving |
| `js/world.js` | builds the town from the map data; collisions, roads, places, building shader |
| `js/infra.js` | road shoulders, kerbs, electric poles and wires, bus shelters, banners, petrol bunk |
| `js/actors.js` | player, vehicles and traffic AI, pedestrians, cows |
| `js/models.js` | procedural low-poly models (vehicles, people, statue, temples, bus stand) |
| `js/audio.js` | all sound effects and ambience, synthesised (no audio files) |
| `js/studio.js` | the music engine: instruments (chenda, tassa, nadaswaram, harmonium, tabla, bass, supersaw, choir…) and a section-based sequencer |
| `js/songs.js` | the ten songs, their lyrics, the four radio stations, and which song scores which game state |
| `js/singer.js` | formant singer: Kannada and Tulu syllables sung on a melody |
| `js/culture.js` | Pili Vesha, Yakshagana, bhajane and Kambala shows with their hours and music |
| `js/food.js` | tindi counters, street carts and the order menu |
| `js/chatter.js` | speech bubbles, neighbourhood chat and road-rage shouts |
| `js/radio.js` | in-vehicle radio: stations, station-switch, DJ idents, lyric display |
| `js/music.js` | small helper for temple bells and birdsong |
| `data/karkala.json` | processed map (roads, lakes, landmarks) |
| `tools/build_map.py` | rebuilds `data/karkala.json` from an OpenStreetMap `map.json` export |

## Credits

* Map data © OpenStreetMap contributors, available under the ODbL.
* three.js (MIT), see `js/THREE_LICENSE`.
* Shops, buses and characters are fictional or parodies.
