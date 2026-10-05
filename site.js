// The little card stack in the hero, and Boone's night shift.
const CARDS = [
  ['Wake Up', 'wake-up'], ['Coffee', 'coffee'], ['Brush Teeth', 'toothbrush'],
  ['Charge Phone', 'charging-station'], ['Send a Text', 'texting'], ['Start Laundry', 'laundry'],
];
const stack = document.getElementById('stack');
const left = document.getElementById('left');
let cards = [...CARDS];

function cardHTML([name, pic]) {
  return `<div class="card big"><span class="tape"></span><img src="img/${pic}.png" alt=""><span>${name}</span></div>`;
}

function draw() {
  if (cards.length === 0) {
    stack.innerHTML = `<div class="card big end"><img src="img/boone-mug.png" alt=""><span>That's the day.</span><button class="link" id="again" type="button">Start over</button></div>`;
    document.getElementById('again').onclick = () => { cards = [...CARDS]; draw(); };
    left.textContent = 'Nice work.';
    return;
  }
  stack.innerHTML = cardHTML(cards[0]) + '<div class="under one"></div><div class="under two"></div>';
  left.textContent = cards.length === CARDS.length ? 'Try it. Tap Done.' : `${cards.length} left`;
}

function move(kind) {
  const top = stack.querySelector('.card');
  if (!top || cards.length === 0) return;
  top.classList.add(kind);
  setTimeout(() => {
    const card = cards.shift();
    if (kind === 'later') cards.push(card);
    draw();
  }, 380);
}

document.getElementById('done').onclick = () => move('done');
document.getElementById('later').onclick = () => move('later');
draw();

// After 7 pm or before 6 am, Boone is on the night shift. Three taps on the dock swap it.
const scene = document.getElementById('scene');
const note = document.getElementById('note');
function shift(night) {
  scene.src = night ? 'img/dock-night-full.jpg' : 'img/dock-day.jpg';
  note.innerHTML = night ? '<b>Evening shift.</b><i>Still here.</i>' : "<b>Morning shift.</b><i>Nothing's urgent.</i>";
  document.getElementById('dock').classList.toggle('night', night);
}
const hour = new Date().getHours();
let night = hour >= 19 || hour < 6;
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
