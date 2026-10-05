// The little card stack in the hero, Break It Down, the stickers, Boone's night shift, and the email sign-up.

// A refresh starts at the top, not wherever the page was left (Colleen, 2026-10-05).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const reloaded = performance.getEntriesByType('navigation')[0]?.type === 'reload';
if (reloaded && location.hash) history.replaceState(null, '', location.pathname + location.search);
if (reloaded || !location.hash) window.scrollTo(0, 0);
const CARDS = [
  ['Wake Up', 'wake-up'], ['Coffee', 'coffee'], ['Brush Teeth', 'toothbrush'],
  ['Charge Phone', 'wireless-charging'], ['Send a Text', 'texting'], ['Start Laundry', 'washing-machine'],
];
const stack = document.getElementById('stack');
const left = document.getElementById('left');
const done = document.getElementById('done');
const later = document.getElementById('later');
let cards = [...CARDS];

function draw(announce) {
  const empty = cards.length === 0;
  done.disabled = later.disabled = empty;
  if (empty) {
    stack.innerHTML = `<div class="card big end"><img src="img/boone-mug.png" alt=""><span>That's it.<br>That's the day.</span><button class="link" id="again" type="button">Start over</button></div>`;
    document.getElementById('again').onclick = () => { cards = [...CARDS]; draw(true); };
    left.textContent = '';
    return;
  }
  const [name, pic] = cards[0];
  stack.innerHTML = `<div class="card big"><span class="tape"></span><img src="img/${pic}.png" alt=""><span>${name}</span></div><div class="under one"></div><div class="under two"></div>`;
  left.textContent = announce ? `${cards.length} left` : '';
}

function move(kind) {
  const top = stack.querySelector('.card');
  if (!top || cards.length === 0) return;
  top.classList.add(kind);
  setTimeout(() => {
    const card = cards.shift();
    if (kind === 'later') cards.push(card);
    draw(true);
  }, 380);
}

done.classList.add('ask');
done.onclick = () => { done.classList.remove('ask'); document.getElementById('done-callout').classList.add('gone'); move('done'); };
later.onclick = () => move('later');
draw(false);

// Android visitors can test now; everyone else gets launch news first.
const android = /Android/i.test(navigator.userAgent);
if (android) {
  const cta = document.getElementById('hero-cta');
  cta.textContent = 'Help test Boone';
  cta.href = '/test.html';
  const alt = document.getElementById('hero-alt');
  alt.textContent = 'Or get launch news';
  alt.href = '#crew';
  document.getElementById('top-link').textContent = 'Help test';
} else {
  document.getElementById('android-ask').hidden = true;
}

// From 8 pm to 6 am, like the app, Boone is on the night shift. Three taps on the dock swap it.
const scene = document.getElementById('scene');
const note = document.getElementById('note');
function shift(night) {
  scene.src = night ? 'img/dock-night-full.jpg' : 'img/dock-day.jpg';
  note.innerHTML = night ? '<b>Evening shift.</b><i>Still here.</i>' : '<b>Morning shift.</b><i>Boone has his coffee before he looks at anything, including the gull.</i>';
  document.getElementById('dock').classList.toggle('night', night);
}
const hour = new Date().getHours();
let night = hour >= 20 || hour < 6;
shift(night);
let taps = 0, tapTimer;
scene.addEventListener('click', () => {
  taps += 1; clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { taps = 0; }, 600);
  if (taps === 3) { night = !night; shift(night); taps = 0; }
});

// The email box sends to Kit in a hidden frame, so visitors stay on the page.
const signup = document.getElementById('signup');
let sent = false;
signup.addEventListener('submit', () => { sent = true; });
document.getElementById('kit-frame').addEventListener('load', () => {
  if (!sent) return;
  signup.hidden = true;
  document.getElementById('thanks').hidden = false;
});

// Break It Down starts folded; the buoy opens the steps and folds them back.
document.documentElement.classList.add('js');
const split = document.getElementById('split');
const buoy = document.getElementById('buoy');
const steps = document.getElementById('steps');
split.classList.add('folded');
steps.inert = true;
buoy.setAttribute('aria-expanded', 'false');
const callout = document.getElementById('buoy-callout');
buoy.addEventListener('click', () => {
  buoy.classList.add('tapped');
  callout.classList.add('gone');
  const open = split.classList.toggle('folded') === false;
  steps.inert = !open;
  buoy.setAttribute('aria-expanded', String(open));
  buoy.classList.remove('nudge');
});

// The buoy and the present give a little wiggle once they are on screen, so they get noticed.
const parcel = document.querySelector('.parcel');
const seen = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    if (entry.target === buoy && split.classList.contains('folded')) buoy.classList.add('nudge');
    if (entry.target === parcel) parcel.classList.add('nudge');
    seen.unobserve(entry.target);
  });
}, { threshold: 0.6 });
seen.observe(buoy);
seen.observe(parcel);

// The holo colors roll on their own; tilting a phone (where the browser allows it)
// or moving the pointer over the stickers slides them by hand for a moment.
const holo = document.querySelector('.holo .rim');
let rollAgain;
const slide = (share) => {
  holo.style.animation = 'none';
  holo.style.setProperty('--holo', `${Math.round(share * 150)}%`);
  clearTimeout(rollAgain);
  rollAgain = setTimeout(() => { holo.style.animation = ''; }, 1500);
};
document.getElementById('finishes').addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse') return;
  const box = event.currentTarget.getBoundingClientRect();
  slide((event.clientX - box.left) / box.width);
});
window.addEventListener('deviceorientation', (event) => {
  if (event.gamma === null) return;
  slide(Math.min(Math.max((event.gamma + 45) / 90, 0), 1));
});

// Phones don't need a hint: the holo colors roll on their own.
if (window.matchMedia('(pointer: coarse)').matches) {
  document.getElementById('finish-hint').hidden = true;
}
