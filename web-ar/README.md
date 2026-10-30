# AR Mammoth (web version)

Open on your phone, no install. **Real-hands mode** uses on-device hand tracking (Google MediaPipe Hand Landmarker, Apache-2.0, bundled in `lib/mediapipe/`): your actual hand touching the mammoth in the camera view makes it react. Interactive 3D mammoth that reacts in real time.

- **Start AR** (Chrome on an ARCore Android phone, e.g. Nothing Phone 3a): finds your table with WebXR hit-test, matches room lighting (WebXR light estimation), you stroke it, tap the table to call it, talk to it, and a bright torch makes it squint.
- **Camera mode** (any phone/laptop): your camera feed with the mammoth in front; touch, voice and torch detection (bright spot in the video) all work.

Voice commands: hello, come here, dance, sit, jump, stop (Chrome speech recognition). Buttons do the same if voice is unavailable.

Files: `index.html` (the whole app), `lib/` (three.js r160, MIT licence, vendored so the page works without external CDNs).


Hand reactions (Real-hands mode): fingers over it = petting (squish, happy eyes, hearts); fast finger jab = jump; waving an open hand = greeting; holding an open palm still = it walks to your hand; it always turns to look at your hand. Your hand is drawn in front of the mammoth, so it looks like you reach in.
