// The iPhone test link, the email sign-up and the Instagram button.

// A refresh starts at the top, not wherever the page was left (Colleen, 2026-10-05).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const reloaded = performance.getEntriesByType('navigation')[0]?.type === 'reload';
if (reloaded && location.hash) history.replaceState(null, '', location.pathname + location.search);
if (reloaded || !location.hash) window.scrollTo(0, 0);
// A ?from= word on the homepage carries on to the test sign-up, so the source isn't lost on the way.
const from = new URLSearchParams(location.search).get('from');
if (from) {
  document.querySelectorAll('a[href="/test.html"]').forEach((link) => { link.search = `?from=${encodeURIComponent(from)}`; });
}

// iPhone visitors can test now; everyone else gets launch news first.
const iphone = /iPhone/i.test(navigator.userAgent);
if (iphone) {
  document.getElementById('top-link').textContent = 'Help Test';
} else {
  document.getElementById('test-ask').hidden = true;
}

// The email box sends to Kit and reads Kit's answer, so "thanks" only shows when the sign-up really arrived.
const signup = document.getElementById('signup');
const signupFailed = document.getElementById('signup-failed');
signup.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = signup.querySelector('button');
  button.disabled = true;
  signupFailed.hidden = true;
  try {
    const response = await fetch(signup.action, { method: 'POST', body: new FormData(signup), headers: { Accept: 'application/json' } });
    const answer = await response.json();
    if (answer.status === 'success') {
      window.goatcounter?.count?.({ path: 'email-signed-up', event: true });
      signup.hidden = true;
      document.getElementById('thanks').hidden = false;
      return;
    }
    // Kit sometimes asks for a quick "I'm not a robot" check first; that page finishes the sign-up.
    if (answer.status === 'quarantined' && answer.url) {
      window.location.href = answer.url;
      return;
    }
    signupFailed.hidden = false;
  } catch {
    signupFailed.hidden = false;
  }
  button.disabled = false;
});

// The Instagram button wiggles once it's on screen, and lets a few hearts float up when touched.
const follow = document.getElementById('follow');
const hearts = () => {
  for (let i = 0; i < 6; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.textContent = '♥';
    heart.setAttribute('aria-hidden', 'true');
    heart.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 160)}px`);
    heart.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 50)}deg`);
    heart.style.animationDelay = `${i * 60}ms`;
    follow.appendChild(heart);
    setTimeout(() => heart.remove(), 1200 + i * 60);
  }
};
follow.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hearts(); });
follow.addEventListener('pointerdown', hearts);
new IntersectionObserver((entries, watcher) => {
  if (!entries[0].isIntersecting) return;
  follow.classList.add('nudge');
  watcher.disconnect();
}, { threshold: 0.8 }).observe(follow);
