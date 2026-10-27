// The letter, the crew's hellos, Clem's sketch and tonight's moon. Every
// crew word here comes from the app (src/copy/words.json: crewCard, hello).

// The letter: Open shows it, then Set Sail heads on to meet the crew.
const openLetter = document.getElementById('open-letter');
openLetter.addEventListener('click', () => {
  document.getElementById('letter-room').classList.add('opened');
  document.getElementById('letter-text').hidden = false;
  openLetter.hidden = true;
  const sail = document.getElementById('set-sail');
  sail.hidden = false;
  sail.focus({ preventScroll: true });
});

// The crew. Boone, Mabel and Clem talk; Keith and Teddy never do.
const CREW = [
  { key: 'boone', name: 'Boone', job: 'Dock Keeper', likes: 'Coffee before anything, page 41 again, the lantern at nine', fact: 'Turns a little pink in the sun. Says he doesn’t.',
    talk: [{ words: 'I’m Boone. I look after myself, so today can be about you.' }] },
  { key: 'mabel', name: 'Mabel', job: 'Timekeeper', likes: 'The same rock every afternoon, warm shallows', fact: 'Boone sets his coffee by her bell.',
    talk: [{ words: 'I’m Mabel, Slackwater’s timekeeper. Welcome.', replies: ['Thank you.', 'I’m so happy to be here.'] },
      { words: 'Slow mornings are my favorite.' }] },
  { key: 'clem', name: 'Clem', job: 'Historian', likes: 'A full page in his notebook, a fresh shell washing in', fact: 'Keeps a tab of Boone’s shells. Boone has never checked it.',
    talk: [{ words: 'Greetings, newcomer. I’m Clem, Slackwater Harbor’s historian and bookkeeper.' },
      { words: 'My job is to keep your binder shipshape.', replies: ['Hi, Clem.', 'Howdy, partner.'] },
      { words: 'It’s a pleasure to meet you.' }] },
  { key: 'keith', name: 'Keith', job: 'First Mate', likes: 'Whatever Boone is eating right now', fact: 'One stolen fish, and he came back every day after.' },
  { key: 'teddy', name: 'Teddy', job: 'Companion', likes: 'Lam-Lam, his lamb, and being carried up the ramp (he can walk)', fact: 'Boone took the knocker off the boathouse door for him.', way: 'He sits down next to you.' },
];

const pick = document.getElementById('crew-pick');
const card = document.getElementById('crew-card');

function showMate(mate) {
  pick.querySelectorAll('[role=tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.key === mate.key)));
  card.innerHTML = `
    <img class="mate-photo" src="img/crew/${mate.key}-portrait.webp" alt="" width="240" height="240">
    <div class="mate-facts">
      <h3>${mate.name}</h3>
      <p class="job">${mate.job}</p>
      <p><b>Likes:</b> ${mate.likes}</p>
      <p>${mate.fact}</p>
    </div>
    <div class="mate-talk" id="mate-talk"></div>`;
  const box = document.getElementById('mate-talk');
  if (mate.way) box.innerHTML = `<p class="way">${mate.way}</p>`;
  if (mate.talk) talkThrough(mate, box, 0);
}

// One line at a time, like the app's talk box: Next, or pick one of two replies.
function talkThrough(mate, box, index) {
  const line = mate.talk[index];
  const said = document.createElement('div');
  said.className = 'talk inline';
  said.innerHTML = `<span class="talk-name">${mate.name}</span><p>${line.words}</p>`;
  box.querySelector('.replies')?.remove();
  box.querySelector('.talk-go')?.remove();
  box.appendChild(said);
  const more = index + 1 < mate.talk.length;
  if (line.replies) {
    const replies = document.createElement('div');
    replies.className = 'replies';
    for (const words of line.replies) {
      const reply = document.createElement('button');
      reply.textContent = words;
      reply.addEventListener('click', () => {
        replies.remove();
        const yours = document.createElement('p');
        yours.className = 'you-said';
        yours.textContent = words;
        box.appendChild(yours);
        if (more) talkThrough(mate, box, index + 1);
      });
      replies.appendChild(reply);
    }
    box.appendChild(replies);
  } else if (more) {
    const next = document.createElement('button');
    next.className = 'talk-go';
    next.setAttribute('aria-label', 'Next');
    next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    next.addEventListener('click', () => talkThrough(mate, box, index + 1));
    said.appendChild(next);
  }
}

for (const mate of CREW) {
  const tab = document.createElement('button');
  tab.setAttribute('role', 'tab');
  tab.dataset.key = mate.key;
  tab.innerHTML = `<img src="img/crew/${mate.key === 'boone' ? 'boone' : `${mate.key}-full`}.webp" alt="" width="240" height="240" loading="lazy"><span>${mate.name}</span>`;
  tab.addEventListener('click', () => showMate(mate));
  pick.appendChild(tab);
}
showMate(CREW[0]);

// Clem's sketches: six he made in the app, one after another.
const SKETCHES = 6;
let sketch = 1;
const sketchImg = document.getElementById('sketch-img');
document.getElementById('sketch-another').addEventListener('click', () => {
  sketch = (sketch % SKETCHES) + 1;
  sketchImg.classList.add('redraw');
  setTimeout(() => {
    sketchImg.src = `img/sketch/s${sketch}.webp`;
    sketchImg.classList.remove('redraw');
  }, 180);
  document.getElementById('clem-words').textContent = 'Anything else? I keep an eraser.';
});
document.getElementById('crew-since').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// Tonight's moon, worked out the way the app does it: days since a known new moon.
const SYNODIC = 29.530588853;
const age = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % SYNODIC + SYNODIC) % SYNODIC;
const PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
document.getElementById('moon-now').textContent = `Tonight: ${PHASES[Math.round(age / (SYNODIC / 8)) % 8]}`;
