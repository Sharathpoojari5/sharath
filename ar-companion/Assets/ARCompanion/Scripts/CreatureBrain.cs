using System.Collections;
using UnityEngine;

namespace ARCompanion
{
    public enum Mood { Idle, Walking, Petted, Dancing, Sitting, Jumping, Greeting, Dazzled }

    /// <summary>
    /// Behaviour of one AR character. Works with ANY model:
    /// - if an Animator is assigned, it fires triggers named after the mood ("Petted", "Dancing", …)
    ///   and sets a bool "Walking" — only for parameters that exist in the controller;
    /// - it always adds simple procedural motion (bounce, squash, spin) to the "body" transform,
    ///   so a plain un-animated model still visibly reacts.
    /// </summary>
    public class CreatureBrain : MonoBehaviour
    {
        [Header("Parts")]
        [Tooltip("Visual root that gets the procedural motion. Defaults to the first child.")]
        public Transform body;
        [Tooltip("Optional eye transforms; squinted when dazzled by a torch.")]
        public Transform[] eyes;
        [Tooltip("Optional Animator for rigged models (e.g. from Mixamo).")]
        public Animator animator;
        [Tooltip("Material for the little hearts shown when petted.")]
        public Material heartMaterial;

        [Header("Tuning")]
        [Tooltip("Height of the model in its own local units (the built-in mammoth is 0.2 = 20 cm).")]
        public float height = 0.2f;
        public float walkSpeed = 0.18f;      // metres per second
        public float turnSpeed = 240f;       // degrees per second

        public Mood CurrentMood => m_Mood;

        Mood m_Mood = Mood.Idle;
        float m_MoodTime, m_MoodDuration;
        Vector3 m_WalkTarget;
        Vector3? m_LookPoint;
        float m_LookUntil;
        Vector3 m_BaseScale, m_BasePos;
        Vector3[] m_EyeScales;
        float m_NextHeart;
        Camera m_Camera;

        // World-space height of the character.
        float Size => height * Mathf.Max(0.01f, transform.lossyScale.y);

        void Awake()
        {
            if (body == null && transform.childCount > 0) body = transform.GetChild(0);
            if (body != null) { m_BaseScale = body.localScale; m_BasePos = body.localPosition; }
            if (eyes != null)
            {
                m_EyeScales = new Vector3[eyes.Length];
                for (int i = 0; i < eyes.Length; i++) if (eyes[i]) m_EyeScales[i] = eyes[i].localScale;
            }
            if (animator == null) animator = GetComponentInChildren<Animator>();
        }

        void Start() => m_Camera = Camera.main;

        // ---------- Public commands ----------

        public void WalkTo(Vector3 worldPoint)
        {
            m_WalkTarget = new Vector3(worldPoint.x, transform.position.y, worldPoint.z);
            SetMood(Mood.Walking, 20f);
        }

        public void Pet()
        {
            if (Time.time >= m_NextHeart) { StartCoroutine(Hearts(2)); m_NextHeart = Time.time + 0.6f; }
            SetMood(Mood.Petted, 1.2f);
        }

        public void Greet()  { LookAtCamera(3f); SetMood(Mood.Greeting, 2f); }
        public void Dance()  => SetMood(Mood.Dancing, 4f);
        public void Sit()    => SetMood(Mood.Sitting, 6f);
        public void Jump()   => SetMood(Mood.Jumping, 0.8f);
        public void Calm()   => SetMood(Mood.Idle, 0f);

        /// <summary>A bright light (e.g. a real torch) is shining from this world position.</summary>
        public void Dazzle(Vector3 lightWorldPos)
        {
            m_LookPoint = lightWorldPos;
            m_LookUntil = Time.time + 1f;
            if (m_Mood == Mood.Idle || m_Mood == Mood.Dazzled) SetMood(Mood.Dazzled, 1.2f);
        }

        public void LookAtCamera(float seconds)
        {
            if (m_Camera == null) m_Camera = Camera.main;
            if (m_Camera == null) return;
            m_LookPoint = m_Camera.transform.position;
            m_LookUntil = Time.time + seconds;
        }

        // ---------- Internals ----------

        void SetMood(Mood mood, float duration)
        {
            bool changed = mood != m_Mood;
            m_Mood = mood;
            m_MoodTime = 0f;
            m_MoodDuration = duration;
            if (changed)
            {
                DebugHUD.Log($"{name}: {mood}");
                FireAnimator(mood);
            }
        }

        void FireAnimator(Mood mood)
        {
            if (animator == null || animator.runtimeAnimatorController == null) return;
            foreach (var p in animator.parameters)
            {
                if (p.type == AnimatorControllerParameterType.Trigger && p.name == mood.ToString()) animator.SetTrigger(p.name);
                if (p.type == AnimatorControllerParameterType.Bool && p.name == "Walking") animator.SetBool(p.name, mood == Mood.Walking);
            }
        }

        void Update()
        {
            float t = Time.time;
            float dt = Time.deltaTime;
            m_MoodTime += dt;

            // Moods with a duration fall back to idle (walking ends on arrival instead).
            if (m_Mood != Mood.Idle && m_Mood != Mood.Walking && m_MoodTime >= m_MoodDuration)
                SetMood(Mood.Idle, 0f);

            // --- Movement and facing ---
            Vector3? face = null;
            if (m_Mood == Mood.Walking)
            {
                Vector3 to = m_WalkTarget - transform.position;
                to.y = 0f;
                if (to.magnitude < 0.02f) { SetMood(Mood.Idle, 0f); LookAtCamera(2f); }
                else
                {
                    face = m_WalkTarget;
                    float step = Mathf.Min(to.magnitude, walkSpeed * dt);
                    transform.position += to.normalized * step;
                }
            }
            else if (m_LookPoint.HasValue && t < m_LookUntil)
            {
                face = m_LookPoint.Value;
            }
            if (face.HasValue)
            {
                Vector3 dir = face.Value - transform.position;
                dir.y = 0f;
                if (dir.sqrMagnitude > 1e-6f)
                    transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(dir), turnSpeed * dt);
            }

            // --- Procedural body motion ---
            if (body == null) return;
            Vector3 s = m_BaseScale;
            Vector3 p = m_BasePos;
            Quaternion r = Quaternion.identity;
            float hop = 0f;
            float eyeSquint = 1f;

            switch (m_Mood)
            {
                case Mood.Idle:
                    s.y *= 1f + 0.03f * Mathf.Sin(t * 2.2f);
                    break;
                case Mood.Walking:
                    hop = Mathf.Abs(Mathf.Sin(t * 11f)) * 0.08f;
                    r = Quaternion.Euler(0f, 0f, Mathf.Sin(t * 11f) * 6f);
                    break;
                case Mood.Petted:
                    float k = Mathf.Abs(Mathf.Sin(t * 12f));
                    s.y *= 1f - 0.12f * k;
                    s.x *= 1f + 0.06f * k;
                    s.z *= 1f + 0.06f * k;
                    r = Quaternion.Euler(0f, 0f, Mathf.Sin(t * 14f) * 7f);
                    eyeSquint = 0.4f;   // happy closed eyes
                    break;
                case Mood.Dancing:
                    r = Quaternion.Euler(0f, (m_MoodTime * 300f) % 360f, Mathf.Sin(t * 8f) * 12f);
                    hop = Mathf.Abs(Mathf.Sin(t * 8f)) * 0.15f;
                    break;
                case Mood.Sitting:
                    s.y *= 0.72f;
                    s.x *= 1.08f;
                    break;
                case Mood.Jumping:
                    float u = Mathf.Clamp01(m_MoodTime / m_MoodDuration);
                    hop = 4f * u * (1f - u) * 0.6f;
                    s.y *= 1f + 0.15f * Mathf.Sin(u * Mathf.PI);
                    break;
                case Mood.Greeting:
                    r = Quaternion.Euler(Mathf.Sin(t * 9f) * 8f, 0f, Mathf.Sin(t * 9f) * 10f);
                    hop = Mathf.Abs(Mathf.Sin(t * 6f)) * 0.05f;
                    break;
                case Mood.Dazzled:
                    r = Quaternion.Euler(-12f, Mathf.Sin(t * 30f) * 4f, 0f);   // lean back, shiver
                    eyeSquint = 0.25f;
                    break;
            }

            // hop is a fraction of the character's height, in the root's local units.
            p.y += hop * height;
            body.localScale = s;
            body.localPosition = p;
            body.localRotation = r;

            if (eyes != null)
                for (int i = 0; i < eyes.Length; i++)
                    if (eyes[i])
                    {
                        Vector3 es = m_EyeScales[i];
                        es.y *= eyeSquint;
                        eyes[i].localScale = Vector3.Lerp(eyes[i].localScale, es, 20f * dt);
                    }
        }

        IEnumerator Hearts(int count)
        {
            for (int i = 0; i < count; i++)
            {
                var h = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Destroy(h.GetComponent<Collider>());
                if (heartMaterial) h.GetComponent<Renderer>().sharedMaterial = heartMaterial;
                h.transform.localScale = Vector3.one * (0.12f * Size);
                Vector3 start = transform.position + Vector3.up * Size + Random.insideUnitSphere * (0.15f * Size);
                StartCoroutine(Float(h.transform, start));
                yield return new WaitForSeconds(0.15f);
            }
        }

        IEnumerator Float(Transform h, Vector3 start)
        {
            float life = 1.1f, a = 0f;
            Vector3 drift = new Vector3(Random.Range(-0.15f, 0.15f), 0.6f, Random.Range(-0.15f, 0.15f)) * Size;
            Vector3 baseScale = h.localScale;
            while (a < life)
            {
                a += Time.deltaTime;
                h.position = start + drift * a;
                h.localScale = baseScale * (1f - a / life * 0.8f);
                yield return null;
            }
            Destroy(h.gameObject);
        }
    }
}
