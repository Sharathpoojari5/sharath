# Hand Powers

Raise your hand in front of the camera. Lightning crackles between your fingers, a galaxy / black hole
floats in your palm, your fingertips burn. Close your fist to charge it, open it fast to release.
One tap records a 15-second vertical clip (with sound) that people can save or share.

Everything runs in the browser: no server, no sign-up, the camera feed never leaves the phone.

## Powers
| Power | One hand | Two hands | Fist, then open |
|---|---|---|---|
| Lightning | arcs between fingertips, random sparks | thick bolts between the hands | giant strike, flash, thunder |
| Galaxy | black hole above the palm; a fist squeezes it | galaxy held between the hands | explosion and shockwave |
| Fire | flames from every fingertip | both hands | fireball burst |

## Run / deploy
Camera access needs HTTPS (or localhost).

    # local test
    cd hand-powers && python3 -m http.server 8000      # then open http://localhost:8000

    # publish free on Cloudflare Pages (from the repo root)
    npx wrangler pages deploy hand-powers --project-name hand-powers --branch main

`?demo=lightning|galaxy|fire` runs it without a camera (synthetic hand), `&two` adds a second hand.

## Notes
* Hand tracking: MediaPipe Hand Landmarker (Apache-2.0), bundled in `lib/mediapipe`.
* Recording uses `MediaRecorder`: Safari and recent Chrome save `.mp4`; older Chrome saves `.webm`
  (convert it in CapCut before posting to Instagram).
* The clip carries a small "HAND POWERS · <site>" watermark so shared videos point back to the page.
