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
  show('screening', pick('q11_q11_radio9') === 'Yes');
}
form.addEventListener('change', update);
update();

// Jotform marks "Something else" with a ticked other box plus the typed words.
const otherText = document.getElementById('other-text');
otherText.addEventListener('input', () => { document.getElementById('other-flag').disabled = !otherText.value.trim(); });

function missing() {
  const gaps = [];
  ['q3_q3_radio1', 'q6_q6_radio4', 'q9_q9_radio7', 'q11_q11_radio9'].forEach((name) => {
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
  // Hidden questions send nothing, the same as on the Jotform page.
  ['play-email', 'screening'].forEach((id) => {
    document.getElementById(id).querySelectorAll('input').forEach((input) => { input.disabled = document.getElementById(id).hidden; });
  });
  document.getElementById('other-flag').disabled = document.getElementById('screening').hidden || !otherText.value.trim();
  document.getElementById('send').disabled = true;
  document.getElementById('jotform-frame').addEventListener('load', () => {
    form.hidden = true;
    show('thanks', true);
    document.getElementById('thanks').focus();
  }, { once: true });
});
