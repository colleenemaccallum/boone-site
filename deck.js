// The card stack on the harbor window: real cards and steps from the app's
// ready-made set. Done or swipe right clears a card, Later or swipe left
// sends it to the back, Steps splits it, Time opens the Time Tools.

const CARDS = [
  { title: 'Make the Bed', pic: 'make-bed', steps: [
    ['Take Off Pillows', 'step-take-pillows-off-the-bed'], ['Pull Up the Covers', 'step-pull-the-sheet-and-blanket-up'],
    ['Smooth the Top', 'step-smooth-out-the-top'], ['Put Pillows Back', 'step-put-the-pillows-back']] },
  { title: 'Coffee', pic: 'coffee' },
  { title: 'Take a Shower', pic: 'shower', steps: [
    ['Set Out a Towel', 'step-put-a-towel-and-clean-clothes-nearby'], ['Turn On the Shower', 'step-turn-on-the-water-and-step-in'],
    ['Wash Your Hair', 'step-wash-your-hair'], ['Wash Your Body', 'step-wash-your-body'], ['Rinse and Turn Off', 'shower']] },
  { title: 'Water the Plants', pic: 'water-plants', steps: [
    ['Fill a Watering Can', 'step-fill-a-watering-can-or-cup'], ['Find Dry Plants', 'step-check-which-plants-have-dry-soil'], ['Water the Dry Ones', 'water-plants']] },
  { title: 'Take Out the Trash', pic: 'take-out-trash', steps: [
    ['Tie Up the Bag', 'step-tie-up-the-trash-bag'], ['Carry to Outside Bin', 'step-carry-it-to-the-outside-bin'], ['Add a New Bag', 'step-put-a-new-bag-in-the-can']] },
  { title: 'Fold Laundry', pic: 'fold-laundry' },
];

const deckBox = document.getElementById('deck');
const undoNote = document.getElementById('undo-note');
const undoWord = document.getElementById('undo-word');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let deck = [];
let lastDeck = null;
let undoTimer = 0;
let timeChip = null;

const cardHtml = (card, place) => `
  <div class="hcard ${place}">
    ${card.of ? `<span class="step-of">${card.of} &middot; Step ${card.step} of ${card.count}</span>` : ''}
    <img src="img/cards/${card.pic}.webp" alt="" width="288" height="288" draggable="false">
    <b>${card.title}</b>
    ${place === 'front' ? '<span class="time-chip" hidden></span>' : ''}
  </div>`;

function draw() {
  clearInterval(timeChip?.tick);
  timeChip = null;
  if (!deck.length) {
    deckBox.innerHTML = `<div class="hcard front quiet"><b class="quiet-title">The Dock Is Quiet.</b><p>That&rsquo;s it. The rest of the day is yours.</p><button class="deal" id="deal">Deal Again</button></div>`;
    document.getElementById('deal').addEventListener('click', deal);
    return;
  }
  deckBox.innerHTML = (deck[1] ? cardHtml(deck[1], 'peek') : '') + cardHtml(deck[0], 'front');
  watchSwipe(deckBox.querySelector('.front'));
}

function deal() {
  deck = CARDS.map((card) => ({ ...card }));
  draw();
}

function remember(word) {
  lastDeck = deck.slice();
  undoWord.textContent = word;
  undoNote.hidden = false;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { undoNote.hidden = true; }, 5000);
}

// The front card leaves the way it went, then the stack moves up.
function leave(direction, after) {
  const front = deckBox.querySelector('.front');
  if (!front || !deck.length) return;
  front.style.transform = '';
  front.classList.add(direction === 'right' ? 'gone-right' : 'gone-left');
  setTimeout(() => { after(); draw(); }, reduced.matches ? 0 : 260);
}

const done = () => { remember('Done'); leave('right', () => deck.shift()); };
const later = () => { remember('Later'); leave('left', () => deck.push(deck.shift())); };

function steps() {
  const card = deck[0];
  if (!card?.steps) {
    deckBox.querySelector('.front')?.classList.add('small-already');
    setTimeout(() => deckBox.querySelector('.front')?.classList.remove('small-already'), 500);
    return;
  }
  remember('Steps');
  const split = card.steps.map(([title, pic], index) => ({ title, pic, of: card.title, step: index + 1, count: card.steps.length }));
  deck.splice(0, 1, ...split);
  draw();
}

// The Time Tools, one running at a time on the front card.
function time() {
  const front = deckBox.querySelector('.front');
  if (!front || front.querySelector('.time-card')) return;
  const sheet = document.createElement('div');
  sheet.className = 'time-card';
  sheet.innerHTML = '<b>Time Tools</b><button data-tool="watch">Stopwatch</button><button data-tool="tide">Tide Timer</button>';
  sheet.addEventListener('click', (event) => {
    const tool = event.target.dataset?.tool;
    if (!tool) return;
    sheet.remove();
    startTool(front.querySelector('.time-chip'), tool);
  });
  front.appendChild(sheet);
}

// The app's own words: the Stopwatch counts up, the Tide Timer stops at a time.
function startTool(chip, tool) {
  clearInterval(timeChip?.tick);
  chip.hidden = false;
  if (tool === 'tide') {
    const at = new Date(Date.now() + 15 * 60e3);
    chip.textContent = `Stops at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    return;
  }
  const began = Date.now();
  const show = () => {
    const minutes = Math.floor((Date.now() - began) / 60e3);
    chip.textContent = minutes ? `${minutes} min so far.` : 'Just started.';
  };
  show();
  timeChip = { tick: setInterval(show, 1000) };
}

// Dragging the front card: far enough right is Done, left is Later.
function watchSwipe(card) {
  let startX = null;
  card.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    startX = event.clientX;
    card.setPointerCapture(event.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (event) => {
    if (startX === null) return;
    const moved = event.clientX - startX;
    card.style.transform = `translateX(${moved}px) rotate(${moved / 20}deg)`;
  });
  const end = (event) => {
    if (startX === null) return;
    const moved = event.clientX - startX;
    startX = null;
    card.classList.remove('dragging');
    const far = card.offsetWidth * 0.3;
    if (moved > far) done();
    else if (moved < -far) later();
    else card.style.transform = '';
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

document.getElementById('port-done').addEventListener('click', done);
document.getElementById('port-later').addEventListener('click', later);
document.getElementById('port-steps').addEventListener('click', steps);
document.getElementById('port-time').addEventListener('click', time);
document.getElementById('undo').addEventListener('click', () => {
  if (!lastDeck) return;
  deck = lastDeck;
  lastDeck = null;
  undoNote.hidden = true;
  draw();
});

deal();
