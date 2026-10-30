using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace ARCompanion
{
    /// <summary>
    /// Turns on the AR features this demo needs and makes the virtual light match the real room:
    /// - depth occlusion (real objects, like your hand, hide the character),
    /// - light estimation (brightness, colour and main light direction of the room).
    /// Put this on the directional light.
    /// </summary>
    [RequireComponent(typeof(Light))]
    public class ARFeatureSetup : MonoBehaviour
    {
        public ARCameraManager cameraManager;
        public AROcclusionManager occlusionManager;
        public float brightnessScale = 1.6f;

        Light m_Light;

        void Awake()
        {
            m_Light = GetComponent<Light>();
            if (cameraManager != null)
            {
                cameraManager.requestedLightEstimation =
                    LightEstimation.AmbientIntensity | LightEstimation.AmbientColor |
                    LightEstimation.MainLightDirection | LightEstimation.MainLightIntensity |
                    LightEstimation.AmbientSphericalHarmonics;
            }
            if (occlusionManager != null)
            {
                occlusionManager.requestedEnvironmentDepthMode = EnvironmentDepthMode.Best;
                occlusionManager.requestedOcclusionPreferenceMode = OcclusionPreferenceMode.PreferEnvironmentOcclusion;
            }
        }

        void OnEnable()  { if (cameraManager != null) cameraManager.frameReceived += OnFrame; }
        void OnDisable() { if (cameraManager != null) cameraManager.frameReceived -= OnFrame; }

        void OnFrame(ARCameraFrameEventArgs args)
        {
            var le = args.lightEstimation;

            if (le.mainLightDirection.HasValue)
                transform.rotation = Quaternion.LookRotation(le.mainLightDirection.Value);

            if (le.averageMainLightBrightness.HasValue)
                m_Light.intensity = le.averageMainLightBrightness.Value * brightnessScale;
            else if (le.averageBrightness.HasValue)
                m_Light.intensity = le.averageBrightness.Value * brightnessScale;

            if (le.mainLightColor.HasValue)
                m_Light.color = le.mainLightColor.Value;
            else if (le.colorCorrection.HasValue)
                m_Light.color = le.colorCorrection.Value;

            if (le.ambientSphericalHarmonics.HasValue)
            {
                RenderSettings.ambientMode = AmbientMode.Skybox;
                RenderSettings.ambientProbe = le.ambientSphericalHarmonics.Value;
            }
        }
    }
}
