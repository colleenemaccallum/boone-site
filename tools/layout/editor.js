// Boone site editor: click words to change them, drag blocks to move them,
// and tune size, spacing and alignment for computers, phones or both.
// What you change is saved for Claude, who puts it on getboone.app.
(() => {
  const site = document.getElementById('site');
  const frame = document.getElementById('frame');
  const sizer = document.getElementById('sizer');
  const stage = document.getElementById('stage');
  const top = document.getElementById('top');
  const panel = document.getElementById('panel');
  const editsStyle = document.getElementById('edits');
  const hoverBox = document.getElementById('hover-box');
  const pickBox = document.getElementById('pick-box');
  const pickLabel = document.getElementById('pick-label');
  const grip = document.getElementById('grip');
  const line = document.getElementById('drop-line');
  const ghost = document.getElementById('ghost');
  const statusEl = document.getElementById('status');

  const BASE_WORDS = window.BASE_WORDS;
  const BASE_ORDER = window.BASE_ORDER;
  const LIVE_CSS = window.LIVE_CSS || {};
  const SIZES = { desk: 1280, phone: 390 };
  const QUERY = { desk: '(min-width: 861px)', phone: '(max-width: 860px)' };
  const ANDROID = /Android/i.test(navigator.userAgent);
  const SCRIPT_WORDS = new Set(['left', 'finish-hint', 'note', 'buoy-callout']);
  const ANDROID_WORDS = new Set(['hero-cta', 'hero-alt', 'top-link']);
  const INLINE_OK = new Set(['B', 'I', 'STRONG', 'EM', 'BR', 'A']);
  const WORD_TAGS = new Set(['H1', 'H2', 'H3', 'P', 'A', 'BUTTON', 'FIGCAPTION', 'LI', 'B', 'SPAN']);
  const NAMES = {
    H1: 'Big headline', H2: 'Heading', H3: 'Small heading', P: 'Words', A: 'Link', BUTTON: 'Button',
    IMG: 'Picture', FIGURE: 'Picture', SECTION: 'Section', HEADER: 'Top bar', FOOTER: 'Bottom bar',
    NAV: 'Links', DIV: 'Group', FORM: 'Sign-up form', SPAN: 'Decoration', svg: 'Drawing', SVG: 'Drawing',
  };

  const empty = () => ({ text: {}, order: {}, css: { both: {}, desk: {}, phone: {} } });
  const copy = (v) => JSON.parse(JSON.stringify(v));
  let state = { ...empty(), css: { both: {}, desk: {}, phone: {}, ...copy(LIVE_CSS) } };
  let view = 'desk';
  let scope = 'both';
  let mode = 'edit';
  let showHidden = true;
  let picked = null;
  let hovered = null;
  let past = [];
  let future = [];
  let db = null;
  let saveTimer = null;
  let ready = false;

  // ---------- reading the page ----------
  const keyOf = (el) => el && el.dataset && el.dataset.e;
  const byKey = (k) => site.querySelector(`[data-e="${k}"]`);
  const isGroup = (el) => el === site || (el && el.hasAttribute && el.hasAttribute('data-c'));
  const fixed = (el) => ['SCRIPT', 'IFRAME', 'LABEL', 'INPUT'].includes(el.tagName);
  const groups = () => [site, ...site.querySelectorAll('[data-c]')];

  function wordsEditable(el) {
    if (!WORD_TAGS.has(el.tagName)) return false;
    if (SCRIPT_WORDS.has(el.id) || (ANDROID && ANDROID_WORDS.has(el.id))) return false;
    return [...el.querySelectorAll('*')].every((c) => INLINE_OK.has(c.tagName));
  }

  function nameOf(el) {
    if (!el) return '';
    if (el.classList.contains('sub')) return 'Line under heading';
    if (el.classList.contains('btn')) return 'Button';
    if (el.tagName === 'SECTION' || el.tagName === 'HEADER' || el.tagName === 'FOOTER') {
      const h = el.querySelector('h1, h2, h3');
      const title = h ? h.textContent.trim().replace(/\.$/, '') : '';
      return `${NAMES[el.tagName]}${title ? `: ${title}` : ''}`;
    }
    if (el.tagName === 'P' && el.parentElement === site) return 'Words on their own';
    return NAMES[el.tagName] || 'Block';
  }

  function pickable(target) {
    let el = target;
    while (el && el !== site) {
      if (keyOf(el) && !fixed(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  // ---------- drawing the state ----------
  function cssFor(css) {
    const rules = (bucket, indent) => Object.entries(bucket || {}).map(([k, props]) => {
      const decls = Object.entries(props).map(([p, v]) => {
        if (p === 'display' && v === 'none' && showHidden) {
          return 'opacity: .3 !important; outline: 2px dashed #b4532a !important; outline-offset: 2px !important';
        }
        return `${p}: ${v} !important`;
      });
      return decls.length ? `${indent}[data-e="${k}"] { ${decls.join('; ')}; }` : '';
    }).filter(Boolean).join('\n');
    let out = rules(css.both, '');
    for (const size of ['desk', 'phone']) {
      const inner = rules(css[size], '  ');
      if (inner) out += `\n@container site ${QUERY[size]} {\n${inner}\n}`;
    }
    return out;
  }

  function draw() {
    // Words
    site.querySelectorAll('[data-e]').forEach((el) => {
      const k = keyOf(el);
      if (!wordsEditable(el) || document.activeElement === el) return;
      const html = k in state.text ? state.text[k] : BASE_WORDS[k];
      if (html !== undefined && el.innerHTML !== html) el.innerHTML = html;
    });
    // Order
    const plan = Object.keys(state.order).length ? state.order : BASE_ORDER;
    groups().forEach((group) => {
      const list = plan[group.dataset.c] || BASE_ORDER[group.dataset.c] || [];
      list.forEach((k) => {
        const el = byKey(k);
        if (el && !el.contains(group)) group.appendChild(el);
      });
    });
    editsStyle.textContent = cssFor(state.css);
    panelDraw();
  }

  function snapshotOrder() {
    const order = {};
    groups().forEach((group) => {
      order[group.dataset.c] = [...group.children].filter((c) => keyOf(c)).map(keyOf);
    });
    return order;
  }

  // ---------- changes, undo, saving ----------
  function change(fn) {
    past.push(JSON.stringify(state));
    if (past.length > 200) past.shift();
    future = [];
    fn();
    draw();
    queueSave();
  }

  function undo() {
    if (!past.length) return;
    future.push(JSON.stringify(state));
    state = JSON.parse(past.pop());
    draw();
    queueSave();
  }

  function redo() {
    if (!future.length) return;
    past.push(JSON.stringify(state));
    state = JSON.parse(future.pop());
    draw();
    queueSave();
  }

  function setStatus(text) { statusEl.textContent = text; }

  function queueSave() {
    ready = false;
    readyDraw();
    setStatus('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
  }

  async function save(extra = {}) {
    const doc = { state, savedAt: Date.now(), ready, ...extra };
    if (db) {
      try {
        await db.doc('editor/draft').set(doc);
        setStatus('Saved');
        return true;
      } catch (err) {
        setStatus('Not saved. Check your connection.');
        return false;
      }
    }
    try {
      localStorage.setItem('boone-editor-draft', JSON.stringify(doc));
      setStatus('Saved in this browser only');
    } catch (err) {
      setStatus('Not saved');
    }
    return false;
  }

  // ---------- the bucket the controls write to ----------
  const bucketName = () => (scope === 'both' ? 'both' : view);
  function current(k, prop) {
    const own = state.css[view] && state.css[view][k] && state.css[view][k][prop];
    if (own !== undefined) return own;
    return state.css.both[k] && state.css.both[k][prop];
  }
  function setProps(k, props) {
    change(() => {
      const bucket = state.css[bucketName()];
      bucket[k] = { ...(bucket[k] || {}) };
      Object.entries(props).forEach(([p, v]) => {
        if (v === null) delete bucket[k][p];
        else bucket[k][p] = String(v);
      });
      if (!Object.keys(bucket[k]).length) delete bucket[k];
    });
  }

  // ---------- controls for the picked block ----------
  const isFlexRow = (el) => {
    const cs = getComputedStyle(el);
    return cs.display.includes('flex') && !cs.flexDirection.startsWith('column');
  };

  function alignWords(el, side) {
    const props = { 'text-align': side };
    if (isFlexRow(el)) props['justify-content'] = { left: 'flex-start', center: 'center', right: 'flex-end' }[side];
    setProps(keyOf(el), props);
  }

  function place(el, side) {
    setProps(keyOf(el), {
      'margin-left': side === 'left' ? '0' : 'auto',
      'margin-right': side === 'right' ? '0' : 'auto',
    });
  }

  function step(el, prop, delta, min, max) {
    const k = keyOf(el);
    if (prop === 'zoom') {
      const now = parseFloat(current(k, 'zoom') || '1');
      const next = Math.round(Math.min(max, Math.max(min, now + delta)) * 100) / 100;
      setProps(k, { zoom: next === 1 ? null : next });
      return;
    }
    let now;
    if (prop === 'max-width') now = parseFloat(current(k, prop)) || el.offsetWidth;
    else now = parseFloat(current(k, prop) ?? getComputedStyle(el)[prop === 'margin-top' ? 'marginTop' : 'marginBottom']) || 0;
    const next = Math.round(Math.min(max, Math.max(min, now + delta)));
    setProps(k, { [prop]: `${next}px` });
  }

  function move(el, dir) {
    const sibs = [...el.parentElement.children].filter((c) => keyOf(c) && !fixed(c) && c.offsetParent !== null);
    const i = sibs.indexOf(el);
    const other = sibs[i + dir];
    if (!other) return;
    change(() => {
      if (dir < 0) other.before(el);
      else other.after(el);
      state.order = snapshotOrder();
    });
  }

  function resetBlock(el) {
    const k = keyOf(el);
    change(() => {
      delete state.css[bucketName()][k];
      delete state.text[k];
    });
  }

  function btn(label, action, opts = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (opts.title) b.title = opts.title;
    if (opts.pressed !== undefined) b.setAttribute('aria-pressed', String(opts.pressed));
    if (opts.disabled) b.disabled = true;
    b.addEventListener('click', action);
    return b;
  }

  function groupOf(label, ...nodes) {
    const g = document.createElement('div');
    g.className = 'ed-group';
    if (label) {
      const s = document.createElement('span');
      s.textContent = label;
      g.append(s);
    }
    g.append(...nodes);
    return g;
  }

  function seg(...buttons) {
    const s = document.createElement('div');
    s.className = 'ed-seg';
    s.append(...buttons);
    return s;
  }

  function val(text) {
    const s = document.createElement('span');
    s.className = 'ed-val';
    s.textContent = text;
    return s;
  }

  function panelDraw() {
    panel.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'ed-panel-row';
    panel.append(row);
    if (mode !== 'edit') {
      row.innerHTML = '<span class="ed-hint">You\'re trying the page like a visitor. Tap <b>Edit</b> at the top to change it again.</span>';
      return;
    }
    const el = picked && site.contains(picked) ? picked : null;
    if (!el) {
      row.innerHTML = '<span class="ed-hint"><b>Click</b> any words or picture to pick it. Type to change words. Drag the yellow <b>Move</b> tab to put it somewhere else.</span>';
      return;
    }
    const k = keyOf(el);
    const h = document.createElement('h2');
    h.textContent = nameOf(el);
    row.append(h);
    const parent = pickable(el.parentElement);
    row.append(groupOf('', btn('Pick what it sits in', () => pick(parent), { disabled: !parent })));
    row.append(groupOf('Move', btn('Up', () => move(el, -1), { title: 'Move up (or left)' }), btn('Down', () => move(el, 1), { title: 'Move down (or right)' })));
    const ta = current(k, 'text-align');
    row.append(groupOf('Words', seg(
      btn('Left', () => alignWords(el, 'left'), { pressed: ta === 'left' }),
      btn('Center', () => alignWords(el, 'center'), { pressed: ta === 'center' }),
      btn('Right', () => alignWords(el, 'right'), { pressed: ta === 'right' }),
    )));
    const ml = current(k, 'margin-left');
    const mr = current(k, 'margin-right');
    const pos = ml === '0' && mr === 'auto' ? 'left' : ml === 'auto' && mr === '0' ? 'right' : ml === 'auto' && mr === 'auto' ? 'center' : '';
    row.append(groupOf('Block', seg(
      btn('Left', () => place(el, 'left'), { pressed: pos === 'left' }),
      btn('Center', () => place(el, 'center'), { pressed: pos === 'center' }),
      btn('Right', () => place(el, 'right'), { pressed: pos === 'right' }),
    )));
    const zoom = parseFloat(current(k, 'zoom') || '1');
    row.append(groupOf('Size', btn('\u2212', () => step(el, 'zoom', -0.05, 0.5, 2.5)), val(`${Math.round(zoom * 100)}%`), btn('+', () => step(el, 'zoom', 0.05, 0.5, 2.5))));
    const mw = current(k, 'max-width');
    row.append(groupOf('Width', btn('Narrower', () => step(el, 'max-width', -40, 120, 1400)), btn('Wider', () => step(el, 'max-width', 40, 120, 1400)), btn('Auto', () => setProps(k, { 'max-width': null }), { disabled: !mw })));
    row.append(groupOf('Space above', btn('\u2212', () => step(el, 'margin-top', -8, 0, 400)), btn('+', () => step(el, 'margin-top', 8, 0, 400))));
    row.append(groupOf('Space below', btn('\u2212', () => step(el, 'margin-bottom', -8, 0, 400)), btn('+', () => step(el, 'margin-bottom', 8, 0, 400))));
    const hidden = current(k, 'display') === 'none';
    row.append(groupOf('', btn(hidden ? 'Show it' : 'Hide it', () => setProps(k, { display: hidden ? null : 'none' }), { pressed: hidden })));
    row.append(groupOf('', btn('Undo all on this block', () => resetBlock(el))));
    if (scope !== 'both') {
      const note = document.createElement('span');
      note.className = 'ed-note';
      note.textContent = `Changes here only affect the ${view === 'desk' ? 'computer' : 'phone'} layout.`;
      row.append(note);
    }
  }

  // ---------- picking and editing words ----------
  function pick(el) {
    if (picked && picked !== el) picked.removeAttribute('contenteditable');
    picked = el;
    if (el && mode === 'edit' && wordsEditable(el)) {
      el.setAttribute('contenteditable', 'true');
      el.spellcheck = true;
    }
    panelDraw();
  }

  let wordsBefore = null;
  site.addEventListener('focusin', (e) => {
    if (e.target.isContentEditable) wordsBefore = JSON.stringify(state);
  });
  site.addEventListener('input', (e) => {
    const el = e.target.closest('[contenteditable="true"]');
    if (!el) return;
    state.text[keyOf(el)] = cleanWords(el.innerHTML);
    queueSave();
  });
  site.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.isContentEditable) return;
    if (wordsBefore && wordsBefore !== JSON.stringify(state)) {
      past.push(wordsBefore);
      future = [];
    }
    wordsBefore = null;
  });
  site.addEventListener('keydown', (e) => {
    if (!e.target.isContentEditable) return;
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    if (e.key === 'Escape') { e.target.blur(); }
  });
  site.addEventListener('paste', (e) => {
    if (!e.target.closest('[contenteditable="true"]')) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });

  function cleanWords(html) {
    const box = document.createElement('div');
    box.innerHTML = html;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 1) {
          walk(c);
          if (!INLINE_OK.has(c.tagName)) { c.replaceWith(...c.childNodes); return; }
          [...c.attributes].forEach((a) => { if (!(c.tagName === 'A' && a.name === 'href')) c.removeAttribute(a.name); });
        } else if (c.nodeType !== 3) c.remove();
      });
    };
    walk(box);
    return box.innerHTML.replace(/&nbsp;/g, ' ').trim();
  }

  // In edit mode the page doesn't react on its own: links don't go anywhere, buttons don't press.
  site.addEventListener('click', (e) => {
    if (mode !== 'edit') return;
    if (e.target.closest('a, button, label, summary')) e.preventDefault();
    e.stopPropagation();
    const el = pickable(e.target);
    if (el !== picked) pick(el);
  }, true);
  site.addEventListener('pointerdown', (e) => {
    if (mode !== 'edit') return;
    const el = pickable(e.target);
    if (el && el !== picked) pick(el);
  }, true);
  site.addEventListener('submit', (e) => { if (mode === 'edit') { e.preventDefault(); e.stopPropagation(); } }, true);
  site.addEventListener('pointerover', (e) => { if (mode === 'edit' && !dragging) hovered = pickable(e.target); });
  site.addEventListener('pointerleave', () => { hovered = null; });

  // ---------- dragging ----------
  let dragging = null;
  let drop = null;

  function rowGroup(group) {
    const cs = getComputedStyle(group);
    if (cs.display.includes('flex')) return !cs.flexDirection.startsWith('column');
    if (cs.display.includes('grid')) return cs.gridTemplateColumns.trim().split(/\s+/).length > 1;
    return false;
  }

  function findDrop(x, y) {
    let t = document.elementFromPoint(x, y);
    while (t && t !== site) {
      if (keyOf(t) && !fixed(t) && t !== dragging && !dragging.contains(t) && isGroup(t.parentElement)) break;
      t = t.parentElement;
    }
    if (!t || t === site) return null;
    const r = t.getBoundingClientRect();
    const across = rowGroup(t.parentElement);
    const before = across ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
    return { t, before, across, r };
  }

  grip.addEventListener('pointerdown', (e) => {
    if (!picked) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    dragging = picked;
    document.body.classList.add('dragging');
    ghost.textContent = `Moving: ${nameOf(picked)}`;
    ghost.style.display = 'block';
    dragMove(e);
  });
  grip.addEventListener('pointermove', (e) => { if (dragging) dragMove(e); });
  grip.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    const el = dragging;
    const d = drop;
    dragging = null;
    drop = null;
    document.body.classList.remove('dragging');
    ghost.style.display = 'none';
    line.style.display = 'none';
    try { grip.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (!d) return;
    change(() => {
      if (d.before) d.t.before(el);
      else d.t.after(el);
      state.order = snapshotOrder();
    });
  });
  grip.addEventListener('pointercancel', () => {
    dragging = null;
    drop = null;
    document.body.classList.remove('dragging');
    ghost.style.display = 'none';
    line.style.display = 'none';
  });

  function dragMove(e) {
    ghost.style.left = `${e.clientX + 14}px`;
    ghost.style.top = `${e.clientY + 14}px`;
    const sr = stage.getBoundingClientRect();
    if (e.clientY < sr.top + 50) stage.scrollTop -= 14;
    if (e.clientY > sr.bottom - 50) stage.scrollTop += 14;
    drop = findDrop(e.clientX, e.clientY);
    if (!drop) { line.style.display = 'none'; return; }
    const { r, before, across } = drop;
    line.style.display = 'block';
    if (across) {
      line.style.left = `${(before ? r.left : r.right) - 2}px`;
      line.style.top = `${r.top}px`;
      line.style.width = '4px';
      line.style.height = `${r.height}px`;
    } else {
      line.style.left = `${r.left}px`;
      line.style.top = `${(before ? r.top : r.bottom) - 2}px`;
      line.style.width = `${r.width}px`;
      line.style.height = '4px';
    }
  }

  // ---------- boxes that follow the page ----------
  function placeBox(box, el) {
    if (!el || !site.contains(el) || mode !== 'edit') { box.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.style.left = `${r.left - 4}px`;
    box.style.top = `${r.top - 4}px`;
    box.style.width = `${r.width + 8}px`;
    box.style.height = `${r.height + 8}px`;
  }
  function tick() {
    placeBox(pickBox, picked);
    if (picked) pickBox.classList.toggle('low', picked.getBoundingClientRect().top < stage.getBoundingClientRect().top + 40);
    placeBox(hoverBox, hovered && hovered !== picked ? hovered : null);
    pickLabel.textContent = nameOf(picked);
    requestAnimationFrame(tick);
  }

  // ---------- the frame: computer or phone ----------
  function fit() {
    stage.style.top = `${top.offsetHeight}px`;
    stage.style.bottom = `${panel.offsetHeight}px`;
    const width = SIZES[view];
    const room = stage.clientWidth - 32;
    const scale = Math.min(1, room / (width + (view === 'phone' ? 20 : 0)));
    frame.style.width = `${width}px`;
    frame.classList.toggle('phone', view === 'phone');
    frame.style.transform = `translateX(-50%) scale(${scale})`;
    sizer.style.width = `${Math.round((width + (view === 'phone' ? 20 : 0)) * scale)}px`;
    sizer.style.height = `${Math.round(frame.offsetHeight * scale)}px`;
  }
  new ResizeObserver(fit).observe(site);
  new ResizeObserver(fit).observe(stage);
  new ResizeObserver(fit).observe(panel);
  window.addEventListener('resize', fit);

  // ---------- top bar ----------
  const viewBtns = { desk: document.getElementById('view-desk'), phone: document.getElementById('view-phone') };
  const scopeSel = document.getElementById('scope');
  const modeBtns = { edit: document.getElementById('mode-edit'), try: document.getElementById('mode-try') };
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const hiddenBox = document.getElementById('show-hidden');
  const resetBtn = document.getElementById('reset');
  const confirmBox = document.getElementById('confirm');
  const sendBtn = document.getElementById('send');

  function setView(v) {
    view = v;
    Object.entries(viewBtns).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === v)));
    scopeSel.options[1].textContent = v === 'desk' ? 'Computer only' : 'Phone only';
    fit();
    panelDraw();
  }
  function setMode(m) {
    mode = m;
    Object.entries(modeBtns).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === m)));
    document.body.classList.toggle('editing', m === 'edit');
    if (m !== 'edit') pick(null);
    panelDraw();
  }
  function readyDraw() {
    sendBtn.textContent = ready ? 'Sent to Claude' : 'Send to Claude';
  }

  viewBtns.desk.addEventListener('click', () => setView('desk'));
  viewBtns.phone.addEventListener('click', () => setView('phone'));
  scopeSel.addEventListener('change', () => { scope = scopeSel.value; panelDraw(); });
  modeBtns.edit.addEventListener('click', () => setMode('edit'));
  modeBtns.try.addEventListener('click', () => setMode('try'));
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  hiddenBox.addEventListener('change', () => { showHidden = hiddenBox.checked; draw(); });
  resetBtn.addEventListener('click', () => confirmBox.classList.add('show'));
  document.getElementById('confirm-no').addEventListener('click', () => confirmBox.classList.remove('show'));
  document.getElementById('confirm-yes').addEventListener('click', () => {
    confirmBox.classList.remove('show');
    change(() => { state = { ...empty(), css: { both: {}, desk: {}, phone: {}, ...copy(LIVE_CSS) } }; });
  });
  sendBtn.addEventListener('click', async () => {
    ready = true;
    readyDraw();
    clearTimeout(saveTimer);
    const ok = await save({ ready: true, readyAt: Date.now() });
    setStatus(ok ? 'Sent. Tell Claude: publish my layout.' : 'Saved here only. Copy needed.');
  });
  setInterval(() => {
    undoBtn.disabled = !past.length;
    redoBtn.disabled = !future.length;
  }, 300);
  document.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    if (e.key === 'Escape') pick(null);
  });

  // ---------- start ----------
  setView(window.innerWidth < 700 ? 'phone' : 'desk');
  setMode('edit');
  draw();
  requestAnimationFrame(tick);
  setStatus('Loading…');

  (async () => {
    try {
      db = window.claude ? await window.claude.use('db') : null;
    } catch (err) {
      db = null;
    }
    let saved = null;
    if (db) {
      try {
        const snap = await db.doc('editor/draft').get();
        saved = snap && (snap.data ? snap.data() : snap);
      } catch (err) {
        saved = null;
      }
    } else {
      try { saved = JSON.parse(localStorage.getItem('boone-editor-draft') || 'null'); } catch (err) { saved = null; }
    }
    if (saved && saved.state) {
      state = { ...empty(), ...saved.state, css: { both: {}, desk: {}, phone: {}, ...(saved.state.css || {}) } };
      ready = !!saved.ready;
      readyDraw();
      draw();
    }
    setStatus(db ? 'Saved' : 'Saving in this browser only');
  })();
})();
