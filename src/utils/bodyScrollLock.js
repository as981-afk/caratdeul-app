// Ref-counted page-scroll lock for modals and pickers.
//
// Multiple dialogs can be stacked (e.g. the photo picker opened over the
// profile editor), so the body is locked while the FIRST lock is held and only
// unlocked when the LAST lock is released. Each holder calls lockBodyScroll()
// on mount and unlockBodyScroll() on cleanup (unmount / route change), which
// guarantees the page can never stay stuck unscrollable.
//
// Hiding the page scrollbar shrinks the viewport by the scrollbar width, which
// shifts every layout by that many pixels — so the same width is re-added as
// padding-right while locked, then removed on unlock. The page's scroll
// position is also restored so closing a tall modal doesn't jump.

let lockCount = 0;
let savedStyle = null;

export function lockBodyScroll() {
  if (lockCount === 0 && typeof document !== "undefined") {
    const body = document.body;
    savedStyle = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      scrollY: window.scrollY || 0,
    };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (lockCount === 0 || typeof document === "undefined") return;
  lockCount -= 1;
  if (lockCount !== 0) return;
  const body = document.body;
  if (savedStyle) {
    body.style.overflow = savedStyle.overflow;
    body.style.paddingRight = savedStyle.paddingRight;
    window.scrollTo(0, savedStyle.scrollY);
    savedStyle = null;
  }
}