using System.IO;
using Unity.XR.CoreUtils;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.XR.ARFoundation;

namespace ARCompanion.EditorTools
{
    /// <summary>
    /// Menu: AR Companion ▸ Build Demo Scene.
    /// Creates the whole demo (AR session, XR origin, managers, lights, mammoth prefab, placement ring)
    /// and sets the Android player settings ARCore needs.
    /// </summary>
    public static class ARCompanionSetup
    {
        const string Root = "Assets/ARCompanion";
        const string GenDir = Root + "/Generated";
        const string ScenePath = Root + "/Scenes/ARCompanion.unity";

        [MenuItem("AR Companion/Build Demo Scene", priority = 0)]
        public static void BuildDemoScene()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Directory.CreateDirectory(GenDir);
            Directory.CreateDirectory(Root + "/Scenes");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // AR Session + XR Origin (Mobile AR): use AR Foundation's own menu items so they are set up exactly as Unity expects.
            bool okSession = EditorApplication.ExecuteMenuItem("GameObject/XR/AR Session");
            Selection.activeObject = null;
            bool okOrigin = EditorApplication.ExecuteMenuItem("GameObject/XR/XR Origin (Mobile AR)");
            var origin = Object.FindFirstObjectByType<XROrigin>();
            if (!okSession || !okOrigin || origin == null || origin.Camera == null)
            {
                EditorUtility.DisplayDialog("AR Companion",
                    "Could not create the AR Session / XR Origin.\n\nMake sure the AR Foundation and Google ARCore XR Plugin packages are installed " +
                    "(start from Unity's \"AR Mobile\" template), then run this menu again.", "OK");
                return;
            }
            Selection.activeObject = null;

            var cam = origin.Camera;
            cam.gameObject.tag = "MainCamera";

            var raycast = GetOrAdd<ARRaycastManager>(origin.gameObject);
            GetOrAdd<ARPlaneManager>(origin.gameObject);
            var camManager = GetOrAdd<ARCameraManager>(cam.gameObject);
            var occlusion = GetOrAdd<AROcclusionManager>(cam.gameObject);

            // Materials and the character prefab.
            var fur = Lit("Fur", new Color(0.45f, 0.30f, 0.20f), 0.25f);
            var dark = Lit("Eyes", new Color(0.05f, 0.05f, 0.06f), 0.85f);
            var ivory = Lit("Tusk", new Color(0.95f, 0.92f, 0.82f), 0.6f);
            var heart = Lit("Heart", new Color(1f, 0.35f, 0.55f), 0.7f);
            var ring = Lit("Ring", new Color(0.16f, 0.77f, 0.90f), 0.5f);
            var shadow = ShadowMaterial();
            var prefab = BuildMammothPrefab(fur, dark, ivory, heart, shadow);

            // Lights.
            var sun = new GameObject("Directional Light (matches room)");
            var sunLight = sun.AddComponent<Light>();
            sunLight.type = LightType.Directional;
            sunLight.shadows = LightShadows.Soft;
            sunLight.intensity = 1f;
            sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var feat = sun.AddComponent<ARFeatureSetup>();
            feat.cameraManager = camManager;
            feat.occlusionManager = occlusion;

            var torch = new GameObject("Torch Light (follows real torch)");
            var torchLight = torch.AddComponent<Light>();
            torchLight.type = LightType.Point;
            torchLight.range = 1.2f;
            torchLight.intensity = 0f;
            torchLight.color = new Color(1f, 0.95f, 0.85f);
            torchLight.shadows = LightShadows.None;

            // Placement ring.
            var reticle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            reticle.name = "Placement Ring";
            Object.DestroyImmediate(reticle.GetComponent<Collider>());
            reticle.transform.localScale = new Vector3(0.12f, 0.002f, 0.12f);
            reticle.GetComponent<Renderer>().sharedMaterial = ring;
            reticle.GetComponent<Renderer>().shadowCastingMode = ShadowCastingMode.Off;
            reticle.SetActive(false);

            // Controller with all behaviours.
            var app = new GameObject("AR Companion");
            app.AddComponent<DebugHUD>();
            var place = app.AddComponent<PlacementController>();
            place.raycastManager = raycast;
            place.arCamera = cam;
            place.characterPrefab = prefab;
            place.reticle = reticle.transform;

            var voice = app.AddComponent<VoiceCommands>();
            voice.placement = place;

            var torchDet = app.AddComponent<TorchDetector>();
            torchDet.cameraManager = camManager;
            torchDet.arCamera = cam;
            torchDet.placement = place;
            torchDet.torchLight = torchLight;

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            ConfigurePlayer();
            AssetDatabase.SaveAssets();

            EditorUtility.DisplayDialog("AR Companion",
                "Demo scene built and saved to " + ScenePath + ".\n\n" +
                "Next: File ▸ Build Profiles ▸ Android ▸ Switch Platform, plug in your phone (USB debugging on), then Build And Run.", "OK");
        }

        [MenuItem("AR Companion/Apply Android Settings Only", priority = 20)]
        public static void ConfigurePlayer()
        {
            var android = NamedBuildTarget.Android;
            PlayerSettings.SetScriptingBackend(android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            if (PlayerSettings.Android.minSdkVersion < AndroidSdkVersions.AndroidApiLevel24)
                PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel24;
            PlayerSettings.productName = "AR Companion";
            PlayerSettings.SetApplicationIdentifier(android, "com.sharath.arcompanion");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            Debug.Log("[ARCompanion] Android settings applied: IL2CPP, ARM64, min API 24, portrait.");
        }

        // ---------------- Character ----------------

        static GameObject BuildMammothPrefab(Material fur, Material dark, Material ivory, Material heart, Material shadow)
        {
            // Units are metres: the mammoth is about 20 cm tall, sized for a desk.
            var root = new GameObject("Mammoth");
            var body = new GameObject("Body");
            body.transform.SetParent(root.transform, false);

            Part(PrimitiveType.Sphere, body, "Torso", new Vector3(0f, 0.105f, -0.01f), new Vector3(0.15f, 0.13f, 0.19f), Vector3.zero, fur);
            Part(PrimitiveType.Sphere, body, "Hump", new Vector3(0f, 0.16f, 0.02f), new Vector3(0.11f, 0.07f, 0.1f), Vector3.zero, fur);
            var head = Part(PrimitiveType.Sphere, body, "Head", new Vector3(0f, 0.15f, 0.09f), new Vector3(0.1f, 0.1f, 0.09f), Vector3.zero, fur);
            Part(PrimitiveType.Capsule, body, "Trunk", new Vector3(0f, 0.09f, 0.135f), new Vector3(0.028f, 0.045f, 0.028f), new Vector3(15f, 0f, 0f), fur);
            Part(PrimitiveType.Capsule, body, "Tusk L", new Vector3(-0.03f, 0.1f, 0.13f), new Vector3(0.012f, 0.035f, 0.012f), new Vector3(60f, 0f, -20f), ivory);
            Part(PrimitiveType.Capsule, body, "Tusk R", new Vector3(0.03f, 0.1f, 0.13f), new Vector3(0.012f, 0.035f, 0.012f), new Vector3(60f, 0f, 20f), ivory);
            Part(PrimitiveType.Sphere, body, "Ear L", new Vector3(-0.055f, 0.155f, 0.075f), new Vector3(0.015f, 0.06f, 0.05f), Vector3.zero, fur);
            Part(PrimitiveType.Sphere, body, "Ear R", new Vector3(0.055f, 0.155f, 0.075f), new Vector3(0.015f, 0.06f, 0.05f), Vector3.zero, fur);
            var eyeL = Part(PrimitiveType.Sphere, body, "Eye L", new Vector3(-0.026f, 0.168f, 0.128f), Vector3.one * 0.016f, Vector3.zero, dark);
            var eyeR = Part(PrimitiveType.Sphere, body, "Eye R", new Vector3(0.026f, 0.168f, 0.128f), Vector3.one * 0.016f, Vector3.zero, dark);
            foreach (var x in new[] { -0.045f, 0.045f })
                foreach (var z in new[] { -0.06f, 0.05f })
                    Part(PrimitiveType.Cylinder, body, "Leg", new Vector3(x, 0.03f, z), new Vector3(0.04f, 0.03f, 0.04f), Vector3.zero, fur);
            Part(PrimitiveType.Capsule, body, "Tail", new Vector3(0f, 0.11f, -0.105f), new Vector3(0.012f, 0.025f, 0.012f), new Vector3(-30f, 0f, 0f), fur);

            // Soft contact shadow on the real table.
            var blob = GameObject.CreatePrimitive(PrimitiveType.Quad);
            blob.name = "Contact Shadow";
            Object.DestroyImmediate(blob.GetComponent<Collider>());
            blob.transform.SetParent(root.transform, false);
            blob.transform.localPosition = new Vector3(0f, 0.002f, 0f);
            blob.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            blob.transform.localScale = new Vector3(0.22f, 0.26f, 1f);
            var br = blob.GetComponent<Renderer>();
            br.sharedMaterial = shadow;
            br.shadowCastingMode = ShadowCastingMode.Off;

            // One collider for touches.
            var col = root.AddComponent<CapsuleCollider>();
            col.center = new Vector3(0f, 0.11f, 0.02f);
            col.radius = 0.09f;
            col.height = 0.26f;
            col.direction = 2;

            var brain = root.AddComponent<CreatureBrain>();
            brain.body = body.transform;
            brain.eyes = new[] { eyeL.transform, eyeR.transform };
            brain.heartMaterial = heart;
            brain.height = 0.2f;

            string path = GenDir + "/Mammoth.prefab";
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefab;
        }

        static GameObject Part(PrimitiveType type, GameObject parent, string name, Vector3 pos, Vector3 scale, Vector3 euler, Material mat)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.SetParent(parent.transform, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.transform.localRotation = Quaternion.Euler(euler);
            go.GetComponent<Renderer>().sharedMaterial = mat;
            return go;
        }

        // ---------------- Materials ----------------

        static Shader LitShader() =>
            Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");

        static Material Lit(string name, Color color, float smoothness)
        {
            string path = $"{GenDir}/{name}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m == null) { m = new Material(LitShader()); AssetDatabase.CreateAsset(m, path); }
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", color);
            if (m.HasProperty("_Color")) m.SetColor("_Color", color);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);
            EditorUtility.SetDirty(m);
            return m;
        }

        static Material ShadowMaterial()
        {
            // Radial gradient texture: dark centre fading to transparent.
            string texPath = GenDir + "/ContactShadow.png";
            if (!File.Exists(texPath))
            {
                const int n = 128;
                var tex = new Texture2D(n, n, TextureFormat.RGBA32, false);
                for (int y = 0; y < n; y++)
                    for (int x = 0; x < n; x++)
                    {
                        float dx = (x + 0.5f) / n * 2f - 1f, dy = (y + 0.5f) / n * 2f - 1f;
                        float d = Mathf.Sqrt(dx * dx + dy * dy);
                        float a = Mathf.Clamp01(1f - d);
                        tex.SetPixel(x, y, new Color(0f, 0f, 0f, a * a * 0.6f));
                    }
                File.WriteAllBytes(texPath, tex.EncodeToPNG());
                Object.DestroyImmediate(tex);
                AssetDatabase.ImportAsset(texPath);
                var imp = (TextureImporter)AssetImporter.GetAtPath(texPath);
                imp.alphaIsTransparency = true;
                imp.wrapMode = TextureWrapMode.Clamp;
                imp.SaveAndReimport();
            }
            var shadowTex = AssetDatabase.LoadAssetAtPath<Texture2D>(texPath);

            string path = GenDir + "/ContactShadow.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Transparent");
            if (m == null) { m = new Material(shader); AssetDatabase.CreateAsset(m, path); }
            // URP Unlit, transparent, alpha blended.
            m.SetFloat("_Surface", 1f);
            m.SetFloat("_Blend", 0f);
            m.SetOverrideTag("RenderType", "Transparent");
            m.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
            m.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            m.SetFloat("_ZWrite", 0f);
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            m.renderQueue = (int)RenderQueue.Transparent;
            if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", shadowTex);
            if (m.HasProperty("_MainTex")) m.SetTexture("_MainTex", shadowTex);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", Color.white);
            EditorUtility.SetDirty(m);
            return m;
        }

        static T GetOrAdd<T>(GameObject go) where T : Component =>
            go.TryGetComponent<T>(out var c) ? c : go.AddComponent<T>();
    }
}
