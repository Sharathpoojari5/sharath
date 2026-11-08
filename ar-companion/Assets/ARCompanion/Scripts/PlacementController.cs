using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace ARCompanion
{
    /// <summary>
    /// Finds a real surface, shows a ring where the character will appear, places it on tap,
    /// then routes touches: stroke the character = pet it, tap the floor = walk there.
    /// </summary>
    public class PlacementController : MonoBehaviour
    {
        public ARRaycastManager raycastManager;
        public Camera arCamera;
        public GameObject characterPrefab;
        [Tooltip("Flat ring that shows where the character will be placed.")]
        public Transform reticle;

        public CreatureBrain Character { get; private set; }

        static readonly List<ARRaycastHit> s_Hits = new List<ARRaycastHit>();

        void Start()
        {
            if (arCamera == null) arCamera = Camera.main;
            DebugHUD.SetStatus("Point the phone at a table and move it slowly");
        }

        void Update()
        {
            if (raycastManager == null || arCamera == null) return;

            if (Character == null) UpdateReticle();

            if (CompanionInput.TryGetTouchDown(out var tap))
            {
                if (Character == null)
                {
                    if (RaycastPlane(tap, out var pose)) Place(pose);
                }
                else if (HitsCharacter(tap))
                {
                    Character.Pet();
                }
                else if (RaycastPlane(tap, out var pose))
                {
                    Character.WalkTo(pose.position);
                }
            }

            if (Character != null && CompanionInput.TryGetDrag(out var drag) && HitsCharacter(drag))
                Character.Pet();
        }

        void UpdateReticle()
        {
            var center = new Vector2(Screen.width * 0.5f, Screen.height * 0.5f);
            bool found = RaycastPlane(center, out var pose);
            if (reticle != null)
            {
                reticle.gameObject.SetActive(found);
                if (found) reticle.SetPositionAndRotation(pose.position, pose.rotation);
            }
            DebugHUD.SetStatus(found ? "Tap to place your mammoth" : "Point the phone at a table and move it slowly");
        }

        void Place(Pose pose)
        {
            // Face the camera.
            Vector3 toCam = arCamera.transform.position - pose.position;
            toCam.y = 0f;
            Quaternion rot = toCam.sqrMagnitude > 1e-4f ? Quaternion.LookRotation(toCam) : pose.rotation;

            var go = Instantiate(characterPrefab, pose.position, rot);
            Character = go.GetComponent<CreatureBrain>();
            if (Character == null) Character = go.AddComponent<CreatureBrain>();
            if (reticle != null) reticle.gameObject.SetActive(false);

            DebugHUD.SetStatus("Stroke it · tap the table · say “hello”, “come here”, “dance”");
            DebugHUD.Log("Placed character");
            Character.Greet();
        }

        public bool RaycastPlane(Vector2 screenPoint, out Pose pose)
        {
            if (raycastManager.Raycast(screenPoint, s_Hits, TrackableType.PlaneWithinPolygon))
            {
                pose = s_Hits[0].pose;
                return true;
            }
            pose = default;
            return false;
        }

        bool HitsCharacter(Vector2 screenPoint)
        {
            if (Character == null) return false;
            Ray ray = arCamera.ScreenPointToRay(screenPoint);
            return Physics.Raycast(ray, out var hit, 20f) && hit.collider.GetComponentInParent<CreatureBrain>() == Character;
        }

        /// <summary>A point on the table roughly in front of the user, for "come here".</summary>
        public Vector3 PointInFrontOfUser()
        {
            var lower = new Vector2(Screen.width * 0.5f, Screen.height * 0.3f);
            if (RaycastPlane(lower, out var pose)) return pose.position;

            // Fallback: 35 cm in front of the camera, at the character's height.
            Vector3 fwd = arCamera.transform.forward;
            fwd.y = 0f;
            Vector3 p = arCamera.transform.position + fwd.normalized * 0.35f;
            if (Character != null) p.y = Character.transform.position.y;
            return p;
        }
    }
}
