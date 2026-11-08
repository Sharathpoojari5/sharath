# Namma Karkala QA harness

Headless Playwright checks used to audit the game (needs `npm i playwright`, Chromium, and the game served on :8770).

    cd namma-karkala && python3 -m http.server 8770 &
    node tools/qa/qa.js        # numbers: roads, buildings, obstacles in carriageways, vehicle dimensions, avatar poses, NPC behaviour
    node tools/qa/junc.js      # oblique shots of junctions (kerbs/markings must not cross carriageways)
    node tools/qa/riders.js    # side views of every rider/driver pose
    node tools/qa/tour.js "Karkala Bus Stand,Aanekere"   # street-level tour of named places
    node tools/qa/veh.js name kind1,kind2 spacing distance   # vehicle line-ups
    node tools/qa/onroad.js    # small obstacles must not stand on roads

Screenshots go to `$QA_OUT` (default /tmp/nk-qa/).
