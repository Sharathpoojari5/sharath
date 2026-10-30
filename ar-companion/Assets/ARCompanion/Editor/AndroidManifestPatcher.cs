#if UNITY_ANDROID
using System.IO;
using UnityEditor.Android;
using UnityEngine;

namespace ARCompanion.EditorTools
{
    /// <summary>
    /// Adds what voice commands need to the generated Android manifest:
    /// the microphone permission, and (Android 11+) visibility of the system speech-recognition service.
    /// </summary>
    public class AndroidManifestPatcher : IPostGenerateGradleAndroidProject
    {
        public int callbackOrder => 999;

        public void OnPostGenerateGradleAndroidProject(string unityLibraryPath)
        {
            string manifest = Path.Combine(unityLibraryPath, "src", "main", "AndroidManifest.xml");
            if (!File.Exists(manifest)) { Debug.LogWarning("[ARCompanion] Manifest not found: " + manifest); return; }

            string xml = File.ReadAllText(manifest);
            string add = "";
            if (!xml.Contains("android.permission.RECORD_AUDIO"))
                add += "  <uses-permission android:name=\"android.permission.RECORD_AUDIO\" />\n";
            if (!xml.Contains("android.speech.RecognitionService"))
                add += "  <queries>\n    <intent>\n      <action android:name=\"android.speech.RecognitionService\" />\n    </intent>\n  </queries>\n";
            if (add.Length == 0) return;

            int at = xml.IndexOf("<application", System.StringComparison.Ordinal);
            if (at < 0) { Debug.LogWarning("[ARCompanion] No <application> tag in manifest."); return; }
            xml = xml.Insert(at, add);
            File.WriteAllText(manifest, xml);
            Debug.Log("[ARCompanion] Added microphone permission and speech-service query to the Android manifest.");
        }
    }
}
#endif
