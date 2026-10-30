# AR Mammoth (web version)

Open on your phone, no install. **Real-hands mode** uses on-device hand tracking (Google MediaPipe Hand Landmarker, Apache-2.0, bundled in `lib/mediapipe/`): your actual hand touching the mammoth in the camera view makes it react. Interactive 3D mammoth that reacts in real time.

- **Start AR** (Chrome on an ARCore Android phone, e.g. Nothing Phone 3a): finds your table with WebXR hit-test, matches room lighting (WebXR light estimation), you stroke it, tap the table to call it, talk to it, and a bright torch makes it squint.
- **Camera mode** (any phone/laptop): your camera feed with the mammoth in front; touch, voice and torch detection (bright spot in the video) all work.

Voice commands: hello, come here, dance, sit, jump, stop (Chrome speech recognition). Buttons do the same if voice is unavailable.

Files: `index.html` (the whole app), `lib/` (three.js r160, MIT licence, vendored so the page works without external CDNs).


Hand reactions (Real-hands mode): fingers over it = petting (squish, happy eyes, hearts); fast finger jab = jump; waving an open hand = greeting; holding an open palm still = it walks to your hand; it always turns to look at your hand. Your hand is drawn in front of the mammoth, so it looks like you reach in.

## Real AR with real hands (Start AR)
Uses WebXR with three optional features on Chrome for Android (ARCore): `hit-test` (find the table), `camera-access` (the camera image, fed to MediaPipe hand tracking) and `depth-sensing` (how far your hand is, so it only counts as touching when it is really at the mammoth, and is drawn in front only when it is closer than the mammoth).
If the camera image looks upside-down to the tracker (hand points land in the wrong place), open the page with `?flip=1` at the end of the address.
If `camera-access`/`depth-sensing` are not supported on a phone, hand tracking falls back to Camera mode.

## Record a reel (post-production mode)
Prop the phone up, tap **Record a reel**, tap Record and reach in. When you stop, the app renders the clip in two passes: (1) it watches the whole recording and finds your hand in every frame, filling short dropouts and smoothing the track; (2) it re-renders the mammoth frame by frame, reacting with ~0.3 s of look-ahead so it turns to your hand before you touch it, with your hand cut out and drawn in front. The result is exported as an MP4 (WebCodecs + mp4-muxer, MIT) with exact frame timing. Limits: fixed camera (phone propped up), max 20 s, silent video.
