import { QUIRKS } from '../game/traits';

export function openFieldGuide(): void {
  if (document.querySelector('.field-guide')) return;
  const root = document.createElement('div');
  root.className = 'field-guide';
  root.innerHTML = `
    <section class="guide-panel">
      <div class="io-head"><div><span class="eyebrow">NOTES FOR THE TRAIL</span><h2>Field guide</h2></div><button class="guide-close" aria-label="Close field guide">✕</button></div>
      <p class="io-body">A little knowledge goes a long way in the Vale.</p>
      <div class="guide-grid">
        <section><span class="eyebrow">01 / FIND YOUR FEET</span><h3>Explore Sprout Hollow</h3><p><kbd>WASD</kbd> or arrow keys to move. <kbd>E</kbd> or Space to talk or enter a building. On a phone, hold the direction buttons and tap the nearby action prompt.</p><p><kbd>C</kbd> opens your Critter-Dex. <kbd>H</kbd> opens this guide. <kbd>Esc</kbd> closes most panels.</p></section>
        <section><span class="eyebrow">02 / KNOW YOUR ELEMENTS</span><h3>Every element has an edge</h3><div class="element-triangle"><span>Ember → Leaf</span><span>Leaf → Aqua</span><span>Aqua → Ember</span></div><p>The arrow points to the element it beats. Favorable attacks deal more damage; the reverse matchup deals less. Normal moves are neutral.</p></section>
        <section><span class="eyebrow">03 / GROW YOUR TEAM</span><h3>Meet the wild residents</h3><p>Walk through tall grass to find wild critters. Weaken one, then open <strong>Bag</strong> and throw a Vale Ball. Your party holds six. Defeating or capturing a critter earns XP; living benched partners share some of it. Some species evolve as they level up.</p><p>Choose <strong>Lead</strong> beside a healthy partner in your party to put them first for the next battle. Prepare before a no-switch trial. Your party shows each partner's element, quirk and XP progress.</p><p>Use Dew Potions during battles. The green healing pad or resting at home restores your team. Leave and reenter the pad if you need another heal.</p></section>
        <section><span class="eyebrow">04 / MAKE YOUR WAY</span><h3>Three crests, one champion</h3><p>Build a varied team and challenge Wardens Pyra, Marlow, and Fern. Earn all three elemental crests to unlock Champion Sol. Each trial may restrict items or switching.</p><p>The HUD tracks your next milestone. You can keep exploring after becoming champion.</p><details><summary>What does my partner's quirk do?</summary>${Object.values(QUIRKS).filter((quirk) => quirk.id !== 'none').map((quirk) => `<p><strong>${quirk.name}:</strong> ${quirk.desc}</p>`).join('')}</details></section>
        <section><span class="eyebrow">05 / AROUND TOWN</span><h3>A place for every possibility</h3><p><strong>Home:</strong> west of your starting point; rest and save.<br><strong>Trading Post:</strong> southwest; spend Sprigs on balls, potions, and revives.<br><strong>Critter Lab:</strong> northeast; summon a new critter or fuse two.</p><p>Summoning costs 60 Sprigs; fusion costs 80. Sprigs are spent when generation starts, even if you close it or discard the result. Failed generation refunds Sprigs. Fusion consumes both parents when you keep the hybrid.</p></section>
        <section><span class="eyebrow">06 / COME BACK ANYTIME</span><h3>Your adventure stays here</h3><p>Progress saves automatically in this browser, including your team, items, position, and crests. It does not sync between devices. Clearing browser data can remove your save.</p><p><strong>New game erases saved progress</strong> after confirmation. Closing a panel does not start a new game.</p></section>
      </div>
      <button class="io-btn io-primary guide-return">Back to the Vale</button>
    </section>`;
  const close = (): void => { root.remove(); window.removeEventListener('keydown', onKey); };
  const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') close(); };
  root.querySelector('.guide-close')!.addEventListener('click', close);
  root.querySelector('.guide-return')!.addEventListener('click', close);
  root.addEventListener('click', (event: MouseEvent): void => { if (event.target === root) close(); });
  document.body.appendChild(root);
  window.addEventListener('keydown', onKey);
}
