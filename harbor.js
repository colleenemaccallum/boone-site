// The harbor window at the top of the homepage: Boone's dock from the app at
// the visitor's hour, with a small stack of real cards to try.

const harbor = document.getElementById('harbor-window');
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

// Boone's day (docs/UNIVERSE.md in the app): each pose, the hour it was
// captured at, its story line, and what Boone says when you tap him.
const HOURS = [
  { at: 7, pose: 'Coffee', time: '7 AM', story: 'Coffee before he looks at anything, including the gull.', says: 'Coffee first. Then everything else.' },
  { at: 9, pose: 'Sweeping', time: '9 AM', story: 'The same planks every morning. Mostly Keith’s feathers.', says: 'Same planks. Mostly feathers.' },
  { at: 11, pose: 'Rope', time: '11 AM', story: 'Rope: coiled.', says: 'Rope: coiled.' },
  { at: 13, pose: 'Lunch', time: '1 PM', story: 'A sandwich from his lunch box. Keith watches every bite.', says: 'Keith is watching my sandwich.' },
  { at: 14, pose: 'Fishing', time: '2 PM', story: 'He catches about one fish. Keith gets most of it.', says: 'One fish. Keith has most of it.' },
  { at: 16, pose: 'Reading', time: '4 PM', story: 'Page 41. Gripping.', says: 'Page 41 again. It’s good.' },
  { at: 18, pose: 'Dinner', time: '6 PM', story: 'Kabob. Keith has opinions about kabobs.', says: 'Kabob. Keith has opinions.' },
  { at: 19, pose: 'Games', time: '7 PM', story: 'The same cozy game every night. He’s very good at the fishing part.', says: 'Same game every night. I’m good at the fishing part.' },
  { at: 21, pose: 'Lantern', time: '9 PM', story: 'Lantern on, for anyone coming in late.', says: 'Lantern’s on. For anyone coming in late.', night: true },
  { at: 23, pose: 'Sleeping', time: '11 PM', story: 'Keith asleep in his flippers.', asleep: 'Boone is asleep. So is Keith.', night: true },
];
// Where Boone stands in each scene (left, top, right, bottom of 840 x 1440).
const BOONE_AT = {
  7: [620, 1042, 760, 1242], 9: [290, 1106, 430, 1306], 11: [236, 1147, 376, 1347], 13: [280, 1203, 420, 1403],
  14: [523, 955, 663, 1155], 16: [251, 1087, 391, 1287], 18: [327, 1197, 467, 1397], 19: [265, 1122, 405, 1322],
  21: [307, 1132, 447, 1332], 23: [277, 1021, 417, 1221],
};
// The pose for a clock hour, by the same table the app uses.
const poseFor = (hour) => {
  const starts = [[4, 7], [9, 9], [11, 11], [13, 13], [14, 14], [16, 16], [18, 18], [19, 19], [21, 21], [23, 23]];
  const found = [...starts].reverse().find(([from]) => hour >= from);
  return HOURS.find((one) => one.at === (found ? found[1] : 23));
};

const scene = document.getElementById('scene');
const hours = document.getElementById('hours');
const poseLine = document.getElementById('pose-line');
const booneSpot = document.getElementById('boone-spot');
let now = poseFor(new Date().getHours());

function showHour(hour) {
  now = hour;
  scene.src = `img/harbor/h${hour.at}.webp`;
  harbor.classList.toggle('night', Boolean(hour.night));
  document.querySelectorAll('.port img').forEach((img) => {
    img.src = img.src.replace(/-(day|night)\.webp$/, `-${hour.night ? 'night' : 'day'}.webp`);
  });
  const [left, top, right, bottom] = BOONE_AT[hour.at];
  Object.assign(booneSpot.style, { left: `${(left / 840) * 100}%`, top: `${(top / 1440) * 100}%`, width: `${((right - left) / 840) * 100}%`, height: `${((bottom - top) / 1440) * 100}%` });
  // The talk box sits low on the dock beside Boone, on his roomier side, never over him.
  const roomLeft = left / 840;
  const roomRight = 1 - right / 840;
  const side = roomLeft > roomRight ? { left: '3%', right: `${(1 - roomLeft) * 100 + 2}%` } : { left: `${(right / 840) * 100 + 2}%`, right: '3%' };
  Object.assign(talk.style, side, { top: `${Math.min((top / 1440) * 100 + 4, 80)}%` });
  poseLine.textContent = hour.story;
  hours.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.at === String(hour.at))));
  closeTalk();
}

// The hour chips under the window.
const lookUp = document.getElementById('look-up');
for (const hour of HOURS) {
  const chip = document.createElement('button');
  chip.dataset.at = hour.at;
  chip.innerHTML = `<b>${hour.pose}</b><span>${hour.time}</span>`;
  chip.addEventListener('click', () => showHour(hour));
  hours.appendChild(chip);
}
// Preload the other hours once the page has settled, so switching is instant.
window.addEventListener('load', () => setTimeout(() => HOURS.forEach((hour) => { new Image().src = `img/harbor/h${hour.at}.webp`; }), 1500));

// Boone's talk box, low on the dock like in the app.
const talk = document.getElementById('talk');
const talkWords = document.getElementById('talk-words');
const talkName = document.getElementById('talk-name');
// The "Look up tonight." note steps aside while Boone talks.
function closeTalk() {
  talk.hidden = true;
  lookUp.hidden = !now.night;
}
booneSpot.addEventListener('click', () => {
  if (!talk.hidden) { closeTalk(); return; }
  talkName.hidden = Boolean(now.asleep);
  talk.classList.toggle('action', Boolean(now.asleep));
  talkWords.textContent = now.asleep ?? now.says;
  talk.hidden = false;
  lookUp.hidden = true;
});
document.getElementById('talk-close').addEventListener('click', closeTalk);

// Shooting stars on the night dock, as in the app: one at a time, a thin
// star in the moon's gold glides down the sky beside the roof, never over the
// card. Tap it while it crosses to make a wish. "Still the Harbor" and less
// motion stop the ones that come on their own; tapping the note still sends one.
const sky = document.getElementById('sky');
const stillButton = document.getElementById('still');
const resting = () => still.matches || stillButton.getAttribute('aria-pressed') === 'true';
// Both start in the open sky left of the card and follow the roof's slope,
// clear of the moon on the right.
const PATHS = [{ x: 16, y: 6.5, side: 'left' }, { x: 12, y: 7, side: 'left' }];
function shootingStar() {
  if (sky.querySelector('.meteor')) return;
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const star = document.createElement('button');
  star.className = `meteor ${path.side}${still.matches ? ' resting' : ''}`;
  star.setAttribute('aria-label', 'Shooting star. Tap to make a wish.');
  star.style.left = `${path.x}%`;
  star.style.top = `${path.y}%`;
  star.innerHTML = '<i></i><i></i><i></i><b></b>';
  star.addEventListener('click', () => {
    star.classList.add('wished');
    setTimeout(() => star.remove(), 900);
  });
  sky.appendChild(star);
  setTimeout(() => { if (!star.classList.contains('wished')) star.remove(); }, still.matches ? 6400 : 3400);
}
lookUp.addEventListener('click', shootingStar);
setInterval(() => {
  if (now.night && !resting() && !document.hidden && Math.random() < 0.4) shootingStar();
}, 7000);
stillButton.addEventListener('click', () => {
  const pressed = stillButton.getAttribute('aria-pressed') !== 'true';
  stillButton.setAttribute('aria-pressed', String(pressed));
  harbor.classList.toggle('resting', pressed);
});

showHour(now);
