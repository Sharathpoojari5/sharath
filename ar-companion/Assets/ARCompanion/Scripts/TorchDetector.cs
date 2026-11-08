using Unity.Collections;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace ARCompanion
{
    /// <summary>
    /// Finds a small, very bright spot in the camera image (a phone torch or flashlight pointed into the scene),
    /// puts a virtual point light at that spot so the character is lit by it, and makes the character react.
    /// </summary>
    public class TorchDetector : MonoBehaviour
    {
        public ARCameraManager cameraManager;
        public Camera arCamera;
        public PlacementController placement;
        [Tooltip("Point light that follows the real torch.")]
        public Light torchLight;

        [Header("Detection")]
        [Tooltip("Pixel brightness (0–255) that counts as 'torch'.")]
        [Range(200, 255)] public int brightThreshold = 248;
        [Tooltip("Average image brightness must be at least this much darker than the threshold, so a bright room does not count.")]
        public int minContrast = 70;
        [Tooltip("Bright area must be smaller than this fraction of the image (a whole bright window is not a torch).")]
        [Range(0.001f, 0.3f)] public float maxBrightFraction = 0.12f;
        public float checksPerSecond = 10f;
        public int downsample = 8;
        public float maxIntensity = 3f;

        [Header("Camera image → screen mapping (portrait default)")]
        [Tooltip("If the orange marker appears in the wrong place, toggle these until it sits on the torch.")]
        public bool swapAxes = true;
        public bool flipX = true;
        public bool flipY = false;
        public bool showMarker = true;

        public bool Detected { get; private set; }

        float m_NextCheck;
        float m_TargetIntensity;
        Vector3 m_TargetPos;

        void Start()
        {
            if (arCamera == null) arCamera = Camera.main;
            if (torchLight != null) torchLight.intensity = 0f;
        }

        void Update()
        {
            if (Time.time >= m_NextCheck && cameraManager != null)
            {
                m_NextCheck = Time.time + 1f / Mathf.Max(1f, checksPerSecond);
                Analyse();
            }

            if (torchLight != null)
            {
                torchLight.intensity = Mathf.Lerp(torchLight.intensity, m_TargetIntensity, 10f * Time.deltaTime);
                if (Detected) torchLight.transform.position = Vector3.Lerp(torchLight.transform.position, m_TargetPos, 12f * Time.deltaTime);
                torchLight.enabled = torchLight.intensity > 0.02f;
            }
        }

        void Analyse()
        {
            if (!cameraManager.TryAcquireLatestCpuImage(out XRCpuImage image)) return;

            int w, h;
            NativeArray<byte> buffer;
            using (image)
            {
                var conv = new XRCpuImage.ConversionParams(image, TextureFormat.R8, XRCpuImage.Transformation.None)
                {
                    outputDimensions = new Vector2Int(Mathf.Max(1, image.width / downsample), Mathf.Max(1, image.height / downsample))
                };
                w = conv.outputDimensions.x;
                h = conv.outputDimensions.y;
                buffer = new NativeArray<byte>(image.GetConvertedDataSize(conv), Allocator.Temp);
                image.Convert(conv, buffer);
            }

            long sum = 0;
            int bright = 0;
            double cx = 0, cy = 0;
            int stride = buffer.Length / h;
            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    byte v = buffer[row + x];
                    sum += v;
                    if (v >= brightThreshold) { bright++; cx += x; cy += y; }
                }
            }
            buffer.Dispose();

            float mean = sum / (float)(w * h);
            float fraction = bright / (float)(w * h);
            bool found = bright >= 2 && fraction <= maxBrightFraction && mean <= brightThreshold - minContrast;

            if (!found)
            {
                if (Detected) DebugHUD.Log("Torch gone");
                Detected = false;
                m_TargetIntensity = 0f;
                DebugHUD.SetMarker(null);
                return;
            }

            // Centroid in normalised image coordinates (origin top-left).
            float u = (float)(cx / bright) / w;
            float v2 = (float)(cy / bright) / h;
            Vector2 vp = ImageToViewport(u, v2);
            if (showMarker) DebugHUD.SetMarker(new Vector2(vp.x * Screen.width, vp.y * Screen.height));

            // Place the virtual light along the camera ray, a bit in front of the character.
            Ray ray = arCamera.ViewportPointToRay(new Vector3(vp.x, vp.y, 0f));
            var c = placement != null ? placement.Character : null;
            float dist = c != null ? Vector3.Distance(arCamera.transform.position, c.transform.position) * 0.7f : 0.4f;
            m_TargetPos = ray.GetPoint(dist);
            if (!Detected) { if (torchLight) torchLight.transform.position = m_TargetPos; DebugHUD.Log("Torch detected"); }
            Detected = true;
            m_TargetIntensity = maxIntensity * Mathf.Clamp01(0.4f + fraction * 20f);

            if (c != null) c.Dazzle(m_TargetPos);
        }

        Vector2 ImageToViewport(float u, float v)
        {
            float sx, sy;
            if (swapAxes) { sx = flipX ? 1f - v : v; sy = flipY ? u : 1f - u; }
            else          { sx = flipX ? 1f - u : u; sy = flipY ? v : 1f - v; }
            return new Vector2(sx, sy);
        }
    }
}
