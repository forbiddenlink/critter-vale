// Shared keyboard behavior for the game's stacked overlay screens.
const MODALS = '.title, .dex, .interior, .summon, .dialog, .faint, .victory, .field-guide, .battle';
const FOCUSABLE = 'button:not(:disabled):not([hidden]), input, textarea, select, a[href], [tabindex="0"]';

export function installOverlayAccessibility(): void {
  let current: HTMLElement | null = null;
  let lastOutsideFocus: HTMLElement | null = null;
  window.addEventListener('focusin', (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement && event.target !== document.body && !event.target.closest(MODALS)) lastOutsideFocus = event.target;
  });
  const previousFocus = new WeakMap<HTMLElement, HTMLElement>();
  const refresh = (): void => {
    const overlays = [...document.querySelectorAll<HTMLElement>(MODALS)];
    const top = overlays.sort((a, b) => Number(getComputedStyle(a).zIndex) - Number(getComputedStyle(b).zIndex)).at(-1) ?? null;
    for (const child of [...document.body.children]) {
      if (child instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(child.tagName)) {
        child.inert = !!top && child !== top && !child.contains(top);
      }
    }
    if (top !== current) {
      const old = current;
      current = top;
      if (top) {
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body && !old?.contains(document.activeElement)) {
          previousFocus.set(top, document.activeElement);
        } else if (lastOutsideFocus?.isConnected) {
          previousFocus.set(top, lastOutsideFocus);
        }
        top.setAttribute('role', 'dialog');
        top.setAttribute('aria-modal', 'true');
        top.tabIndex = -1;
      } else if (old) {
        const prior = previousFocus.get(old);
        // Let Chromium update the inert subtree before restoring keyboard focus.
        if (prior?.isConnected) setTimeout(() => { if (!current && prior.isConnected) { prior.getBoundingClientRect(); prior.focus({ preventScroll: true }); } }, 100);
      }
    }
    if (!top) return;
    const heading = top.querySelector('h1, h2, .dialog-name, .switch-title');
    top.setAttribute('aria-label', heading?.textContent ?? (top.matches('.battle') ? 'Critter battle' : 'Critter Vale'));
    if (!top.contains(document.activeElement)) {
      (top.matches(".title") ? top : top.querySelector<HTMLElement>(FOCUSABLE) ?? top).focus({ preventScroll: true });
    }
  };
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !current) return;
    const nested = current.querySelector<HTMLElement>('.switch-menu');
    const scope = nested ?? current;
    const targets = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.getClientRects().length > 0);
    const first = targets[0];
    const last = targets.at(-1);
    if (!first) { event.preventDefault(); scope.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !scope.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  refresh();
}
