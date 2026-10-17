import { useEffect, useRef, useState } from "react";
import "./HeartButton.css";

// Heart toggle, shared by every row/card/modal that offers My List. It reads
// `checked` straight from the shared favorites state so the same item always
// shows the same heart everywhere it appears. `aria-pressed` + the switch of
// the label mirror the state for assistive tech, the glyph is wrapped so the
// pop animation scales it without moving the (sometimes absolutely-positioned)
// button, and the click never bubbles up to the card/navigation handler.
export function HeartButton({ checked, onClick }) {
  const prev = useRef(checked);
  const [pop, setPop] = useState(false);
  const timer = useRef(null);

  // Replays the pop animation on every toggle (not just on mount): bump `pop`
  // whenever `checked` flips, then drop it again once the animation has had
  // time to play so the next toggle starts from rest.
  useEffect(() => {
    if (prev.current === checked) return;
    prev.current = checked;
    setPop(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPop(false), 320);
    return () => clearTimeout(timer.current);
  }, [checked]);

  // Clean up the pending timer on unmount so a toggled-away row can't later
  // touch state on a dead component.
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={`heart-btn${checked ? " heart-on" : ""}${pop ? " heart-pop" : ""}`}
      title={checked ? "Remove from favorites" : "Add to favorites"}
      aria-label={checked ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={checked}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="heart-glyph" aria-hidden="true">{checked ? "♥" : "♡"}</span>
    </button>
  );
}

export default HeartButton;