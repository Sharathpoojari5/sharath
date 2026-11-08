using System.Collections.Generic;
using UnityEngine;

namespace ARCompanion
{
    /// <summary>Simple on-screen text overlay: status line, voice state and the last few events.</summary>
    public class DebugHUD : MonoBehaviour
    {
        static DebugHUD s_Instance;
        static readonly Queue<string> s_Lines = new Queue<string>();
        static string s_Status = "Starting AR…";
        static string s_Mic = "voice: off";
        static Vector2? s_Marker;

        public bool showEventLog = true;

        GUIStyle m_Style;
        GUIStyle m_Big;

        void Awake() => s_Instance = this;

        public static void Log(string message)
        {
            Debug.Log("[ARCompanion] " + message);
            s_Lines.Enqueue(message);
            while (s_Lines.Count > 5) s_Lines.Dequeue();
        }

        public static void SetStatus(string status) => s_Status = status;
        public static void SetMic(string mic) => s_Mic = "voice: " + mic;

        /// <summary>Screen position (pixels, bottom-left origin) to mark, e.g. the detected torch. Null hides it.</summary>
        public static void SetMarker(Vector2? screenPos) => s_Marker = screenPos;

        void OnGUI()
        {
            if (m_Style == null)
            {
                int size = Mathf.Max(18, Screen.height / 50);
                m_Style = new GUIStyle(GUI.skin.label) { fontSize = size, wordWrap = true };
                m_Style.normal.textColor = Color.white;
                m_Big = new GUIStyle(m_Style) { fontSize = Mathf.RoundToInt(size * 1.3f), fontStyle = FontStyle.Bold };
            }

            float pad = Screen.width * 0.04f;
            float w = Screen.width - pad * 2f;
            // GUI y grows downward; start below the notch / status bar.
            float y = Screen.height - Screen.safeArea.yMax + pad;

            GUI.color = new Color(0f, 0f, 0f, 0.45f);
            GUI.DrawTexture(new Rect(0, y - pad * 0.5f, Screen.width, m_Big.fontSize * 2.6f + pad), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(pad, y, w, m_Big.fontSize * 1.6f), s_Status, m_Big);
            GUI.Label(new Rect(pad, y + m_Big.fontSize * 1.5f, w, m_Style.fontSize * 1.5f), s_Mic, m_Style);

            if (showEventLog)
            {
                float ly = Screen.height - pad - s_Lines.Count * m_Style.fontSize * 1.4f;
                foreach (var line in s_Lines)
                {
                    GUI.Label(new Rect(pad, ly, w, m_Style.fontSize * 1.5f), line, m_Style);
                    ly += m_Style.fontSize * 1.4f;
                }
            }

            if (s_Marker.HasValue)
            {
                float r = Screen.width * 0.03f;
                var p = s_Marker.Value;
                GUI.color = new Color(1f, 0.6f, 0.1f, 0.9f);
                GUI.DrawTexture(new Rect(p.x - r, Screen.height - p.y - r, r * 2f, r * 2f), Texture2D.whiteTexture);
                GUI.color = Color.white;
            }
        }
    }
}
