using UnityEngine;

namespace ARCompanion
{
    /// <summary>Touch/mouse helper that works with both the new Input System and the legacy Input Manager.</summary>
    public static class CompanionInput
    {
        /// <summary>True on the frame a finger touches down (or the mouse is clicked in the editor).</summary>
        public static bool TryGetTouchDown(out Vector2 position)
        {
#if ENABLE_INPUT_SYSTEM
            var ts = UnityEngine.InputSystem.Touchscreen.current;
            if (ts != null && ts.primaryTouch.press.wasPressedThisFrame)
            {
                position = ts.primaryTouch.position.ReadValue();
                return true;
            }
            var mouse = UnityEngine.InputSystem.Mouse.current;
            if (mouse != null && mouse.leftButton.wasPressedThisFrame)
            {
                position = mouse.position.ReadValue();
                return true;
            }
#else
            if (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began)
            {
                position = Input.GetTouch(0).position;
                return true;
            }
            if (Input.GetMouseButtonDown(0))
            {
                position = Input.mousePosition;
                return true;
            }
#endif
            position = default;
            return false;
        }

        /// <summary>True while a finger is held down and moving (a stroke).</summary>
        public static bool TryGetDrag(out Vector2 position)
        {
#if ENABLE_INPUT_SYSTEM
            var ts = UnityEngine.InputSystem.Touchscreen.current;
            if (ts != null && ts.primaryTouch.press.isPressed && ts.primaryTouch.delta.ReadValue().sqrMagnitude > 4f)
            {
                position = ts.primaryTouch.position.ReadValue();
                return true;
            }
            var mouse = UnityEngine.InputSystem.Mouse.current;
            if (mouse != null && mouse.leftButton.isPressed && mouse.delta.ReadValue().sqrMagnitude > 4f)
            {
                position = mouse.position.ReadValue();
                return true;
            }
#else
            if (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Moved)
            {
                position = Input.GetTouch(0).position;
                return true;
            }
#endif
            position = default;
            return false;
        }
    }
}
