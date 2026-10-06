// The tester sign-up: shows only the questions that apply, checks the required ones, then sends the answers to Jotform.
const form = document.getElementById('tester');
const pick = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value;
const show = (id, on) => { document.getElementById(id).hidden = !on; };

function update() {
  const adult = pick('q3_q3_radio1');
  show('not-yet', adult === 'No');
  show('rest', adult !== 'No');
  const phone = pick('q6_q6_radio4');
  show('iphone-note', phone === 'iPhone');
  show('play-email', phone === 'Android' || phone === 'Both');
}
form.addEventListener('change', update);
update();

function missing() {
  const gaps = [];
  ['q3_q3_radio1', 'q6_q6_radio4'].forEach((name) => {
    if (!pick(name)) gaps.push(form.querySelector(`input[name="${name}"]`).closest('.q'));
  });
  const fields = ['q4_q4_textbox2', 'q5_q5_email3'];
  if (!document.getElementById('play-email').hidden) fields.push('q8_q8_email6');
  fields.forEach((name) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input.value.trim() || !input.checkValidity()) gaps.push(input.closest('.q'));
  });
  return gaps;
}

form.addEventListener('submit', (event) => {
  form.querySelectorAll('.needs').forEach((el) => el.classList.remove('needs'));
  const gaps = missing();
  show('missing', gaps.length > 0);
  if (gaps.length) {
    event.preventDefault();
    gaps.forEach((el) => el.classList.add('needs'));
    gaps[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  // A hidden question sends nothing, the same as on the Jotform page.
  document.querySelectorAll('#play-email input').forEach((input) => { input.disabled = document.getElementById('play-email').hidden; });
  document.getElementById('js-tracker').value = `build-date-1791212105601=>submit:${Date.now()}`;
  document.getElementById('submit-date').value = String(Date.now());
  show('failed', false);
  const send = document.getElementById('send');
  send.disabled = true;
  // Jotform sends people on to our own /sent.html page. Seeing it in the frame is the only proof the answers arrived.
  document.getElementById('jotform-frame').addEventListener('load', (loaded) => {
    let arrived = false;
    try { arrived = loaded.target.contentWindow.location.pathname === '/sent.html'; } catch { arrived = false; }
    if (!arrived) {
      send.disabled = false;
      show('failed', true);
      return;
    }
    window.goatcounter?.count?.({ path: 'tester-signed-up', event: true });
    form.hidden = true;
    show('thanks', true);
    document.getElementById('thanks').focus();
  }, { once: true });
});
