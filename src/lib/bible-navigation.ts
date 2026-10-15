/** Reusing the current hash must also reveal its collapsed chapter. */
export function navigateBible(id: string) {
  window.location.hash = id;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.setTimeout(() => {
    const target = document.getElementById(id);
    target?.scrollIntoView({ block: "start", behavior: "instant" });
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }, 80);
}
