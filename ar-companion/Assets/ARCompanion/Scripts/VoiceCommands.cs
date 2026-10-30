using System;
using System.Collections;
using System.Collections.Concurrent;
using UnityEngine;
#if UNITY_ANDROID
using UnityEngine.Android;
#endif

namespace ARCompanion
{
    /// <summary>
    /// Continuous voice commands using Android's built-in SpeechRecognizer (no extra plugin, works on the Nothing Phone).
    /// Recognised phrases: hello / hi / hey, come here, dance, sit, jump, stop / stay.
    /// </summary>
    public class VoiceCommands : MonoBehaviour
    {
        public PlacementController placement;
        [Tooltip("Language tag for recognition, e.g. en-IN, en-US, hi-IN.")]
        public string language = "en-IN";

        readonly ConcurrentQueue<Action> m_MainThread = new ConcurrentQueue<Action>();

#if UNITY_ANDROID && !UNITY_EDITOR
        AndroidJavaObject m_Activity, m_Recognizer, m_Intent;
        Listener m_Listener;
#endif

        IEnumerator Start()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            if (!Permission.HasUserAuthorizedPermission(Permission.Microphone))
            {
                Permission.RequestUserPermission(Permission.Microphone);
                float waited = 0f;
                while (!Permission.HasUserAuthorizedPermission(Permission.Microphone) && waited < 20f)
                {
                    waited += 0.5f;
                    yield return new WaitForSeconds(0.5f);
                }
            }
            if (!Permission.HasUserAuthorizedPermission(Permission.Microphone))
            {
                DebugHUD.SetMic("microphone permission denied");
                yield break;
            }

            m_Activity = GetActivity();
            var srClass = new AndroidJavaClass("android.speech.SpeechRecognizer");
            if (!srClass.CallStatic<bool>("isRecognitionAvailable", m_Activity))
            {
                DebugHUD.SetMic("speech recognition not available on this phone");
                yield break;
            }

            m_Listener = new Listener(this);
            m_Intent = new AndroidJavaObject("android.content.Intent", "android.speech.action.RECOGNIZE_SPEECH");
            m_Intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.LANGUAGE_MODEL", "free_form");
            m_Intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.LANGUAGE", language);
            m_Intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.PARTIAL_RESULTS", true);
            m_Intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.MAX_RESULTS", 3);

            RunOnUiThread(() =>
            {
                m_Recognizer = srClass.CallStatic<AndroidJavaObject>("createSpeechRecognizer", m_Activity);
                m_Recognizer.Call("setRecognitionListener", m_Listener);
                m_Recognizer.Call("startListening", m_Intent);
            });
#else
            DebugHUD.SetMic("voice works on the phone only (editor: keys H C D S J X)");
            yield break;
#endif
        }

        void Update()
        {
            while (m_MainThread.TryDequeue(out var a)) a();

#if UNITY_EDITOR && ENABLE_INPUT_SYSTEM
            var kb = UnityEngine.InputSystem.Keyboard.current;
            if (kb != null)
            {
                if (kb.hKey.wasPressedThisFrame) Handle("hello");
                if (kb.cKey.wasPressedThisFrame) Handle("come here");
                if (kb.dKey.wasPressedThisFrame) Handle("dance");
                if (kb.sKey.wasPressedThisFrame) Handle("sit");
                if (kb.jKey.wasPressedThisFrame) Handle("jump");
                if (kb.xKey.wasPressedThisFrame) Handle("stop");
            }
#endif
        }

        void Post(Action a) => m_MainThread.Enqueue(a);

        /// <summary>Map heard text to a character action. Returns true if a command matched.</summary>
        public bool Handle(string heard)
        {
            if (string.IsNullOrEmpty(heard)) return false;
            string s = " " + heard.ToLowerInvariant() + " ";
            var c = placement != null ? placement.Character : null;
            if (c == null) { DebugHUD.Log($"Heard “{heard}” — place the character first"); return false; }

            if (s.Contains("come")) c.WalkTo(placement.PointInFrontOfUser());
            else if (s.Contains("dance")) c.Dance();
            else if (s.Contains(" sit")) c.Sit();
            else if (s.Contains("jump")) c.Jump();
            else if (s.Contains("stop") || s.Contains("stay")) c.Calm();
            else if (s.Contains("hello") || s.Contains(" hi ") || s.Contains("hey") || s.Contains("look at me")) c.Greet();
            else { DebugHUD.Log($"Heard “{heard}”"); return false; }

            DebugHUD.Log($"Heard “{heard}”");
            return true;
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        static AndroidJavaObject GetActivity()
        {
#if UNITY_2023_1_OR_NEWER
            return AndroidApplication.currentActivity;
#else
            using (var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                return player.GetStatic<AndroidJavaObject>("currentActivity");
#endif
        }

        void RunOnUiThread(Action a)
        {
            m_Activity.Call("runOnUiThread", new AndroidJavaRunnable(() =>
            {
                try { a(); }
                catch (Exception e) { Post(() => DebugHUD.Log("Voice error: " + e.Message)); }
            }));
        }

        void Restart(float delay) => Post(() => StartCoroutine(RestartAfter(delay)));

        IEnumerator RestartAfter(float delay)
        {
            yield return new WaitForSeconds(delay);
            RunOnUiThread(() =>
            {
                m_Recognizer.Call("cancel");
                m_Recognizer.Call("startListening", m_Intent);
            });
        }

        void OnDestroy()
        {
            if (m_Recognizer != null) RunOnUiThread(() => m_Recognizer.Call("destroy"));
        }

        /// <summary>Receives android.speech.RecognitionListener callbacks on the Android UI thread.</summary>
        class Listener : AndroidJavaProxy
        {
            readonly VoiceCommands m_Owner;
            bool m_HandledPartial;

            public Listener(VoiceCommands owner) : base("android.speech.RecognitionListener") { m_Owner = owner; }

            public override AndroidJavaObject Invoke(string methodName, AndroidJavaObject[] args)
            {
                switch (methodName)
                {
                    case "onReadyForSpeech":
                        m_HandledPartial = false;
                        m_Owner.Post(() => DebugHUD.SetMic("listening…"));
                        return null;
                    case "onBeginningOfSpeech":
                        m_Owner.Post(() => DebugHUD.SetMic("hearing you…"));
                        return null;
                    case "onPartialResults":
                        // React fast: act on a partial phrase once, if it already contains a command.
                        string partial = First(args[0]);
                        if (!m_HandledPartial && !string.IsNullOrEmpty(partial))
                            m_Owner.Post(() => { if (m_Owner.Handle(partial)) m_HandledPartial = true; });
                        return null;
                    case "onResults":
                        string text = First(args[0]);
                        bool already = m_HandledPartial;
                        m_Owner.Post(() => { if (!already) m_Owner.Handle(text); });
                        m_Owner.Restart(0.2f);
                        return null;
                    case "onError":
                        int code = args[0] != null ? args[0].Call<int>("intValue") : -1;
                        // 6 = speech timeout, 7 = no match: normal when nobody speaks.
                        if (code != 6 && code != 7) m_Owner.Post(() => DebugHUD.SetMic("error " + code + ", retrying"));
                        m_Owner.Restart(code == 8 ? 1.0f : 0.3f);   // 8 = recognizer busy
                        return null;
                    case "onRmsChanged":
                    case "onBufferReceived":
                    case "onEndOfSpeech":
                    case "onEvent":
                    case "onSegmentResults":
                    case "onEndOfSegmentedSession":
                    case "onLanguageDetection":
                        return null;
                }
                return base.Invoke(methodName, args);
            }

            static string First(AndroidJavaObject bundle)
            {
                if (bundle == null) return null;
                var list = bundle.Call<AndroidJavaObject>("getStringArrayList", "results_recognition");
                if (list == null || list.Call<int>("size") == 0) return null;
                return list.Call<string>("get", 0);
            }
        }
#endif
    }
}
