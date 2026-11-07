# AR Companion — real-time reactive 3D character (Phase 1)

A Unity AR app for the **Nothing Phone (3a)** (any ARCore phone works). A little mammoth stands on your real table and reacts to you live:

| You do | It reacts | How |
|---|---|---|
| Point phone at a table, tap the ring | Appears, looks at you and waves | AR Foundation plane detection + raycast |
| Stroke it with your finger | Squishes happily, closes eyes, hearts float up | Touch ray hits its collider |
| Tap the table somewhere | Walks there | Plane raycast → walk target |
| Say **“hello”**, **“come here”**, **“dance”**, **“sit”**, **“jump”**, **“stop”** | Does it | Android’s built-in SpeechRecognizer, continuous |
| Shine a real torch into the scene | Lit by it, leans back and squints | Brightest spot in the camera image → virtual point light |
| Move your hand in front of it | Your hand hides it | ARCore Depth API occlusion |
| Turn room lights on/off | Its lighting and shadow follow | ARCore light estimation |

Everything runs on the phone in real time. The mammoth is built from simple shapes so it works with zero downloads; you can swap in any 3D model later (see below).

---

## 1. Install (one time, about 1 hour)

1. Install **Unity Hub** → install **Unity 6 (LTS)** and tick **Android Build Support** with **OpenJDK** and **Android SDK & NDK Tools**.
2. On the phone: Settings → About phone → tap **Build number** 7 times → Developer options → turn on **USB debugging**.
   Make sure **Google Play Services for AR** is installed/updated from the Play Store.

## 2. Create the project (5 minutes)

1. Unity Hub → **New project** → template **AR Mobile** → name it `ARCompanion` → Create.
   *If you don’t see “AR Mobile”: use **Universal 3D**, then Window → Package Manager → install **AR Foundation** and **Google ARCore XR Plugin**, and in Edit → Project Settings → XR Plug-in Management → Android tab, tick **Google ARCore**.*
2. Copy the folder `ar-companion/Assets/ARCompanion` from this repo into your project’s `Assets` folder.
3. Wait for Unity to compile, then click the new menu **AR Companion → Build Demo Scene**.
   It creates the AR session, camera managers, lights, the mammoth prefab, the placement ring and all behaviours, saves the scene and sets Android options (IL2CPP, ARM64, min API 24, portrait).

## 3. Build to your phone (5 minutes)

1. File → **Build Profiles** → **Android** → **Switch Platform**.
2. Plug in the phone, allow USB debugging, select it under **Run Device**.
3. Click **Build And Run**. First build takes several minutes.
4. On the phone: allow **camera** and **microphone**.

## 4. Test checklist

- [ ] Move the phone slowly over a table → a cyan ring appears → tap → mammoth appears and waves.
- [ ] Stroke it with one finger → hearts, happy squish.
- [ ] Tap elsewhere on the table → it walks there.
- [ ] Say “hello”, “dance”, “sit”, “jump”, “come here”, “stop”. The top bar shows what it heard.
- [ ] Dim the room, shine a torch from a second phone into view → orange dot marks the torch, the mammoth lights up and squints.
- [ ] Put your hand between the phone and the mammoth → your hand covers it.

## Troubleshooting

| Problem | Fix |
|---|---|
| Menu “AR Companion” missing | Check the Console for compile errors; confirm AR Foundation is installed. |
| Orange torch dot is in the wrong place | Select **AR Companion** in the scene → **Torch Detector** → toggle *Swap Axes / Flip X / Flip Y* until the dot sits on the torch. |
| Torch triggers in a bright room | Raise **Min Contrast** or **Bright Threshold** on Torch Detector. |
| “speech recognition not available” | Install/update the **Google** app and enable its speech services; set **Language** on Voice Commands (default `en-IN`). |
| Phone beeps every few seconds | Some phones beep when listening restarts — lower the media/system volume. |
| Hand does not hide the mammoth | The URP renderer must have **AR Background Renderer Feature** (the AR Mobile template already has it). Depth needs good light and some movement. |
| Black camera screen | Project Settings → XR Plug-in Management → Android → tick **Google ARCore**. |

## Use your own 3D character

1. Import a model (FBX/GLB, e.g. from Mixamo or a Sketchfab model with a suitable licence). Keep it under ~50k triangles.
2. Drag it into the scene, add **Creature Brain** and a **Capsule Collider** around it, set **Height** to the model’s height in its own units.
3. If it has an Animator, add parameters named after moods (Trigger `Petted`, `Dancing`, `Greeting`, `Jumping`, `Sitting`, `Dazzled`; Bool `Walking`) — the brain fires them automatically.
4. Drag it into your Project window to make a prefab, then set it as **Character Prefab** on **AR Companion → Placement Controller**.

## Code map

| File | Job |
|---|---|
| `Scripts/PlacementController.cs` | Surface finding, ring, tap-to-place, touch routing (pet / walk) |
| `Scripts/CreatureBrain.cs` | Moods and reactions (procedural motion + optional Animator triggers) |
| `Scripts/VoiceCommands.cs` | Continuous Android speech recognition → commands |
| `Scripts/TorchDetector.cs` | Bright-spot detection on the CPU camera image → virtual light |
| `Scripts/ARFeatureSetup.cs` | Turns on depth occlusion and light estimation, drives the main light |
| `Scripts/DebugHUD.cs` | On-screen status, what it heard, torch marker |
| `Editor/ARCompanionSetup.cs` | One-click scene + prefab + Android settings |
| `Editor/AndroidManifestPatcher.cs` | Adds microphone permission and speech-service query to the manifest |

## Roadmap

- **Phase 2 — real hands:** MediaPipe hand landmarks + depth, so you pet it with your actual hand instead of the screen.
- **Phase 3 — objects:** detect a cup with MediaPipe Object Detector → walk over and drink.
- **Phase 4 — two characters:** add a caveman; state machine + IK so he climbs onto the mammoth.
- **Phase 5 — demo reel:** screen-record the phone + film yourself from the side, edit split-screen.

> Note: this code was written without access to Unity, and nothing in it has been compiled or run yet. The syntax was parsed and the AR Foundation calls were checked against the real 6.0.8 package source. If the Console shows an error after import, copy it back and it can be fixed quickly.
