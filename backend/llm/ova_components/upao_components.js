/* UPAO Components v1.0 — Universidad Privada Antenor Orrego
   Vanilla JS Custom Elements for SCORM Learning Objects.
   Self-contained: no CDN, no external deps. */
(function (G) {
  'use strict';

  /* ── Design tokens ─────────────────────────────────────────────────── */
  const T = {
    primary:   '#0A3D91',
    primaryHv: '#072C6B',
    accent:    '#F47A20',
    accentHv:  '#D9650F',
    accentTint:'#FDEEE0',
    bg:        '#F7F9FC',
    surface:   '#FFFFFF',
    surfTint:  '#EAF0FB',
    text:      '#15233B',
    muted:     '#5A6B85',
    border:    '#E2E8F2',
    success:   '#1B9C6B',
    successBg: '#DCFCE7',
    danger:    '#D64545',
    dangerBg:  '#FEE2E2',
    radius:    '12px',
    radiusSm:  '8px',
    shadow:    '0 4px 20px rgba(10,61,145,.09)',
    shadowMd:  '0 8px 32px rgba(10,61,145,.14)',
    fontDisp:  "Georgia, Cambria, 'Times New Roman', serif",
    fontBody:  "'Trebuchet MS', 'Lucida Grande', system-ui, sans-serif",
    ease:      'cubic-bezier(.4,0,.2,1)',
  };

  /* ── Global keyframes (injected once) ──────────────────────────────── */
  const GLOBAL_CSS = `
@keyframes upao-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes upao-scale{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
@keyframes upao-wave{0%,100%{height:5px}50%{height:26px}}
@keyframes upao-fill{from{width:0}to{width:var(--upao-fw,100%)}}
@keyframes upao-bounce{0%{transform:scale(.7)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes upao-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes upao-spin{to{transform:rotate(360deg)}}
@keyframes upao-pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes upao-confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(-50px) rotate(360deg);opacity:0}}
`;
  if (!G.document.getElementById('_upao_gbl')) {
    const s = G.document.createElement('style');
    s.id = '_upao_gbl';
    s.textContent = GLOBAL_CSS;
    G.document.head.appendChild(s);
  }

  /* ── Base class ─────────────────────────────────────────────────────── */
  class UE extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); }
    $ (sel) { return this.shadowRoot.querySelector(sel); }
    $$(sel) { return this.shadowRoot.querySelectorAll(sel); }
    emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
    }
    css(s) {
      return `<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:${T.fontBody};color:${T.text};line-height:1.55}${s}</style>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. upao-card  —  Base container with UPAO branding
     Attrs: title, subtitle, eyebrow, icon
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOCard extends UE {
    connectedCallback() {
      const eyebrow  = this.getAttribute('eyebrow')  || '';
      const title    = this.getAttribute('title')    || '';
      const subtitle = this.getAttribute('subtitle') || '';
      const icon     = this.getAttribute('icon')     || '';
      this.shadowRoot.innerHTML = this.css(`
        .card{background:${T.surface};border-radius:${T.radius};box-shadow:${T.shadow};
          overflow:hidden;animation:upao-in .35s ${T.ease} both}
        .head{background:${T.primary};padding:20px 24px 18px;position:relative}
        .head::after{content:'';position:absolute;bottom:0;left:24px;right:24px;
          height:3px;background:${T.accent};border-radius:3px 3px 0 0}
        .eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.12em;
          color:${T.accent};text-transform:uppercase;margin-bottom:6px}
        .title-row{display:flex;align-items:center;gap:10px}
        .icon{font-size:1.6rem;line-height:1}
        .title{font-family:${T.fontDisp};font-size:clamp(1.2rem,3vw,1.55rem);
          font-weight:700;color:#fff;line-height:1.2}
        .subtitle{font-size:.82rem;color:rgba(255,255,255,.72);margin-top:6px}
        .body{padding:20px 24px 24px;background:${T.surface}}
      `) + `
      <div class="card">
        <div class="head">
          ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
          <div class="title-row">
            ${icon ? `<span class="icon" aria-hidden="true">${icon}</span>` : ''}
            ${title ? `<h1 class="title">${title}</h1>` : ''}
          </div>
          ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="body"><slot></slot></div>
      </div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. upao-node  —  Expandable content node (timelines, maps, steps)
     Attrs: number, title, label, year, expanded
     ══════════════════════════════════════════════════════════════════════ */
  class UPAONode extends UE {
    connectedCallback() {
      const num   = this.getAttribute('number') || this.getAttribute('year') || '•';
      const title = this.getAttribute('title') || '';
      const label = this.getAttribute('label') || '';
      const open  = this.hasAttribute('expanded');
      this.shadowRoot.innerHTML = this.css(`
        .wrap{border:1.5px solid ${T.border};border-radius:${T.radius};
          background:${T.surface};overflow:hidden;transition:box-shadow .2s ${T.ease};
          animation:upao-in .3s ${T.ease} both}
        .wrap:hover{box-shadow:${T.shadow}}
        .head{display:flex;align-items:center;gap:14px;padding:14px 18px;cursor:pointer;
          user-select:none;background:${T.surface};border-left:4px solid ${T.accent}}
        .head:focus-visible{outline:3px solid ${T.primary};outline-offset:2px}
        .num{min-width:38px;height:38px;border-radius:50%;background:${T.primary};
          color:#fff;font-family:${T.fontDisp};font-size:.9rem;font-weight:700;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          transition:background .2s}
        .wrap[open] .num{background:${T.accent}}
        .titles{flex:1;min-width:0}
        .t-label{font-size:.7rem;font-weight:700;letter-spacing:.1em;
          text-transform:uppercase;color:${T.accent};margin-bottom:2px}
        .t-title{font-family:${T.fontDisp};font-weight:700;color:${T.primary};
          font-size:clamp(.95rem,2.5vw,1.1rem);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chevron{transition:transform .25s ${T.ease};color:${T.muted};font-size:.8rem;flex-shrink:0}
        .wrap[open] .chevron{transform:rotate(180deg)}
        .body{max-height:0;overflow:hidden;transition:max-height .32s ${T.ease};background:${T.bg}}
        .wrap[open] .body{max-height:800px}
        .body-inner{padding:16px 18px 18px 70px;font-size:.95rem;line-height:1.65;color:${T.text}}
      `) + `
      <div class="wrap"${open ? ' open' : ''} role="group">
        <div class="head" role="button" tabindex="0" aria-expanded="${open}">
          <span class="num">${num}</span>
          <div class="titles">
            ${label ? `<p class="t-label">${label}</p>` : ''}
            <p class="t-title">${title}</p>
          </div>
          <span class="chevron" aria-hidden="true">▼</span>
        </div>
        <div class="body"><div class="body-inner"><slot></slot></div></div>
      </div>`;
      const wrap = this.$('.wrap'), head = this.$('.head');
      const toggle = () => {
        const isOpen = wrap.hasAttribute('open');
        wrap.toggleAttribute('open', !isOpen);
        head.setAttribute('aria-expanded', String(!isOpen));
        this.emit('upao-node-toggle', { open: !isOpen, title });
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. upao-choice  —  Option button with correct/incorrect feedback
     Attrs: value, correct ("true"/"false"), feedback, group, disabled
     Events: upao-choice-selected { value, correct, group }
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOChoice extends UE {
    connectedCallback() {
      const val      = this.getAttribute('value')    || 'A';
      const correct  = this.getAttribute('correct')  === 'true';
      const feedback = this.getAttribute('feedback') || '';
      const group    = this.getAttribute('group')    || 'default';
      this.shadowRoot.innerHTML = this.css(`
        .btn{width:100%;display:flex;align-items:flex-start;gap:12px;padding:14px 16px;
          border:2px solid ${T.border};border-radius:${T.radiusSm};background:${T.surface};
          cursor:pointer;text-align:left;font-family:${T.fontBody};font-size:.95rem;
          color:${T.text};transition:all .2s ${T.ease};line-height:1.5}
        .btn:hover:not([disabled]){border-color:${T.primary};background:${T.surfTint}}
        .btn:focus-visible{outline:3px solid ${T.primary};outline-offset:2px}
        .btn[disabled]{cursor:not-allowed;opacity:.7}
        .btn.correct{border-color:${T.success};background:${T.successBg};animation:upao-bounce .4s ${T.ease}}
        .btn.wrong{border-color:${T.danger};background:${T.dangerBg};animation:upao-shake .3s ${T.ease}}
        .badge{min-width:28px;height:28px;border-radius:50%;background:${T.primary};
          color:#fff;font-size:.78rem;font-weight:700;display:flex;align-items:center;
          justify-content:center;flex-shrink:0;transition:background .2s}
        .btn.correct .badge{background:${T.success}}
        .btn.wrong .badge{background:${T.danger}}
        .text{flex:1}
        .fb{margin-top:8px;padding:10px 12px;border-radius:${T.radiusSm};font-size:.88rem;
          display:none;line-height:1.45}
        .btn.correct .fb{display:block;background:${T.successBg};color:#166534}
        .btn.wrong .fb{display:block;background:${T.dangerBg};color:#991b1b}
        .status{font-size:1rem;margin-left:auto;flex-shrink:0}
      `) + `
      <button class="btn" aria-label="Opción ${val}" data-group="${group}" data-correct="${correct}">
        <span class="badge">${val}</span>
        <div class="text">
          <span class="main-text"><slot></slot></span>
          ${feedback ? `<div class="fb" role="alert">${feedback}</div>` : ''}
        </div>
        <span class="status" aria-hidden="true"></span>
      </button>`;
      this.$('.btn').addEventListener('click', () => {
        if (this.$('.btn').disabled) return;
        document.querySelectorAll(`[data-group="${group}"]`).forEach(el => { el.disabled = true; });
        const btn = this.$('.btn');
        btn.disabled = true;
        if (correct) {
          btn.classList.add('correct');
          this.$('.status').textContent = '✓';
        } else {
          btn.classList.add('wrong');
          this.$('.status').textContent = '✗';
        }
        this.emit('upao-choice-selected', { value: val, correct, group });
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. upao-reveal  —  Hidden content revealed on click
     Attrs: label, icon, trigger-id (external element id to listen to)
     Methods: reveal(), hide(), toggle()
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOReveal extends UE {
    connectedCallback() {
      const label = this.getAttribute('label') || 'Mostrar';
      const icon  = this.getAttribute('icon')  || '💡';
      this.shadowRoot.innerHTML = this.css(`
        .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;
          background:${T.accent};color:#fff;border:none;border-radius:${T.radiusSm};
          font-family:${T.fontBody};font-size:.92rem;font-weight:600;cursor:pointer;
          transition:all .2s ${T.ease}}
        .btn:hover{background:${T.accentHv};transform:translateY(-1px)}
        .btn:focus-visible{outline:3px solid ${T.primary};outline-offset:2px}
        .btn[aria-expanded="true"]{background:${T.primary}}
        .body{overflow:hidden;max-height:0;transition:max-height .35s ${T.ease},
          opacity .3s ${T.ease};opacity:0;margin-top:0}
        .body.open{max-height:1200px;opacity:1;margin-top:14px}
        .inner{padding:16px 18px;background:${T.accentTint};border-radius:${T.radiusSm};
          border-left:4px solid ${T.accent};font-size:.95rem;line-height:1.65;color:${T.text}}
      `) + `
      <button class="btn" aria-expanded="false">${icon} <span>${label}</span></button>
      <div class="body" role="region"><div class="inner"><slot></slot></div></div>`;
      const btn  = this.$('.btn');
      const body = this.$('.body');
      this.reveal  = () => { body.classList.add('open'); btn.setAttribute('aria-expanded','true'); };
      this.hide    = () => { body.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };
      this.toggle  = () => body.classList.contains('open') ? this.hide() : this.reveal();
      btn.addEventListener('click', this.toggle);
      const tid = this.getAttribute('trigger-id');
      if (tid) {
        document.getElementById(tid)?.addEventListener('click', () => this.reveal());
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. upao-progress  —  Progress bar + counter
     Attrs: current, total, label, show-fraction
     Methods: set(n), increment()
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOProgress extends UE {
    connectedCallback() {
      this._cur   = parseInt(this.getAttribute('current') || '0', 10);
      this._total = parseInt(this.getAttribute('total')   || '1', 10);
      const label = this.getAttribute('label') || 'Progreso';
      const showF = this.hasAttribute('show-fraction');
      this.shadowRoot.innerHTML = this.css(`
        :host{display:block}
        .wrap{display:flex;flex-direction:column;gap:6px}
        .row{display:flex;justify-content:space-between;align-items:center}
        .lbl{font-size:.78rem;font-weight:700;letter-spacing:.08em;
          text-transform:uppercase;color:${T.muted}}
        .frac{font-size:.78rem;font-weight:700;color:${T.primary}}
        .track{height:8px;background:${T.surfTint};border-radius:4px;overflow:hidden;
          border:1px solid ${T.border}}
        .fill{height:100%;border-radius:4px;background:${T.accent};
          transition:width .45s ${T.ease};width:0}
        .steps{display:flex;gap:6px;flex-wrap:wrap}
        .dot{width:8px;height:8px;border-radius:50%;background:${T.border};
          transition:background .3s,transform .25s ${T.ease}}
        .dot.done{background:${T.accent};transform:scale(1.2)}
      `) + `
      <div class="wrap" role="progressbar" aria-valuemin="0" aria-valuemax="${this._total}" aria-valuenow="${this._cur}" aria-label="${label}">
        <div class="row">
          <span class="lbl">${label}</span>
          ${showF ? `<span class="frac"><span id="cn">${this._cur}</span>/${this._total}</span>` : ''}
        </div>
        <div class="track"><div class="fill" id="fill"></div></div>
        <div class="steps">${Array.from({ length: this._total }, (_, i) =>
          `<div class="dot${i < this._cur ? ' done' : ''}" data-i="${i}"></div>`
        ).join('')}</div>
      </div>`;
      this._render();
      this.set       = (n)  => { this._cur = Math.min(Math.max(0, n), this._total); this._render(); };
      this.increment = ()   => this.set(this._cur + 1);
    }
    _render() {
      const pct = this._total ? (this._cur / this._total) * 100 : 0;
      const fill = this.$('#fill');
      if (fill) fill.style.width = pct + '%';
      const cn = this.$('#cn');
      if (cn) cn.textContent = this._cur;
      this.$$('.dot').forEach((d, i) => d.classList.toggle('done', i < this._cur));
      this.setAttribute('aria-valuenow', String(this._cur));
      if (this._cur >= this._total) this.emit('upao-progress-complete');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. upao-timer  —  Countdown timer
     Attrs: seconds, autostart, label
     Methods: start(), stop(), reset()
     Events: upao-timer-tick { remaining }, upao-timer-end
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOTimer extends UE {
    connectedCallback() {
      this._total   = parseInt(this.getAttribute('seconds') || '30', 10);
      this._rem     = this._total;
      this._raf     = null;
      this._start   = null;
      const label   = this.getAttribute('label') || 'Tiempo';
      this.shadowRoot.innerHTML = this.css(`
        .wrap{display:inline-flex;align-items:center;gap:10px;
          padding:10px 18px;border-radius:${T.radiusSm};background:${T.surfTint};
          border:1.5px solid ${T.border};font-family:${T.fontDisp}}
        .lbl{font-size:.75rem;font-weight:700;text-transform:uppercase;
          letter-spacing:.1em;color:${T.muted}}
        .time{font-size:1.5rem;font-weight:700;color:${T.primary};
          min-width:3.2ch;text-align:center;transition:color .4s}
        .time.warn{color:${T.accent}}
        .time.danger{color:${T.danger};animation:upao-pulse .8s infinite}
        .icon{font-size:1.1rem}
      `) + `
      <div class="wrap" role="timer" aria-live="off" aria-label="${label}">
        <span class="icon" aria-hidden="true">⏱</span>
        <div><div class="lbl">${label}</div><div class="time" id="t">${this._fmt(this._rem)}</div></div>
      </div>`;
      const tick = () => {
        const elapsed = (Date.now() - this._start) / 1000;
        this._rem = Math.max(0, this._total - elapsed);
        const t = this.$('#t');
        t.textContent = this._fmt(this._rem);
        t.className = 'time' + (this._rem < 5 ? ' danger' : this._rem < this._total * .3 ? ' warn' : '');
        this.emit('upao-timer-tick', { remaining: Math.ceil(this._rem) });
        if (this._rem <= 0) { this.emit('upao-timer-end'); return; }
        this._raf = requestAnimationFrame(tick);
      };
      this.start = () => { if (this._raf) return; this._start = Date.now() - (this._total - this._rem) * 1000; this._raf = requestAnimationFrame(tick); };
      this.stop  = () => { cancelAnimationFrame(this._raf); this._raf = null; };
      this.reset = () => { this.stop(); this._rem = this._total; this.$('#t').textContent = this._fmt(this._rem); this.$('#t').className = 'time'; };
      if (this.hasAttribute('autostart')) this.start();
    }
    _fmt(s) { s = Math.ceil(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    disconnectedCallback() { this.stop && this.stop(); }
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. upao-score  —  Animated score display
     Attrs: current, max, label
     Methods: add(n), set(n)
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOScore extends UE {
    connectedCallback() {
      this._val   = parseInt(this.getAttribute('current') || '0', 10);
      const max   = this.getAttribute('max')   || '100';
      const label = this.getAttribute('label') || 'Puntuación';
      this.shadowRoot.innerHTML = this.css(`
        .wrap{display:inline-flex;align-items:center;gap:12px;
          padding:10px 20px;border-radius:${T.radiusSm};background:${T.primary};color:#fff}
        .lbl{font-size:.72rem;font-weight:700;letter-spacing:.1em;
          text-transform:uppercase;opacity:.75}
        .val{font-family:${T.fontDisp};font-size:1.6rem;font-weight:700;
          color:${T.accent};min-width:4ch;text-align:right;
          animation:upao-count-up .25s ${T.ease}}
        .max{font-size:.75rem;opacity:.6;margin-left:2px}
      `) + `
      <div class="wrap" role="status" aria-live="polite" aria-label="${label}: ${this._val} de ${max}">
        <span>🏆</span>
        <div><div class="lbl">${label}</div></div>
        <div class="val" id="v">${this._val}</div><span class="max">/${max}</span>
      </div>`;
      this.set = (n) => {
        this._val = n;
        const el = this.$('#v');
        el.textContent = n;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        this.$('.wrap').setAttribute('aria-label', `${label}: ${n} de ${max}`);
      };
      this.add = (n) => this.set(this._val + n);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. upao-nav  —  Step navigation (prev / next + dots)
     Attrs: total, current (1-based), prev-label, next-label
     Events: upao-nav-change { index, prev }
     Methods: go(n), next(), prev()
     ══════════════════════════════════════════════════════════════════════ */
  class UPAONav extends UE {
    connectedCallback() {
      this._total = parseInt(this.getAttribute('total')   || '1', 10);
      this._cur   = parseInt(this.getAttribute('current') || '1', 10);
      const pLbl  = this.getAttribute('prev-label') || '← Anterior';
      const nLbl  = this.getAttribute('next-label') || 'Siguiente →';
      this.shadowRoot.innerHTML = this.css(`
        .nav{display:flex;align-items:center;justify-content:space-between;
          gap:16px;padding:12px 0}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;
          border-radius:${T.radiusSm};font-family:${T.fontBody};font-size:.9rem;
          font-weight:600;cursor:pointer;transition:all .2s ${T.ease};border:2px solid ${T.primary}}
        .btn.prev{background:transparent;color:${T.primary}}
        .btn.prev:hover:not([disabled]){background:${T.surfTint}}
        .btn.next{background:${T.accent};color:#fff;border-color:${T.accent}}
        .btn.next:hover:not([disabled]){background:${T.accentHv};transform:translateY(-1px)}
        .btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
        .btn:focus-visible{outline:3px solid ${T.primary};outline-offset:2px}
        .dots{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
        .dot{width:10px;height:10px;border-radius:50%;background:${T.border};
          transition:all .25s ${T.ease};cursor:pointer}
        .dot.active{background:${T.primary};transform:scale(1.35)}
        .dot.done{background:${T.accent}}
      `) + `
      <nav class="nav" aria-label="Navegación de pasos">
        <button class="btn prev" id="prev" aria-label="${pLbl}">${pLbl}</button>
        <div class="dots" role="list" aria-label="Pasos">${Array.from({ length: this._total }, (_, i) =>
          `<div class="dot${i + 1 === this._cur ? ' active' : i + 1 < this._cur ? ' done' : ''}" data-i="${i + 1}" role="listitem" aria-label="Paso ${i + 1}"></div>`
        ).join('')}</div>
        <button class="btn next" id="next" aria-label="${nLbl}">${nLbl}</button>
      </nav>`;
      const upd = () => {
        this.$('#prev').disabled = this._cur <= 1;
        this.$('#next').disabled = this._cur >= this._total;
        this.$$('.dot').forEach((d, i) => {
          d.className = 'dot' + (i + 1 === this._cur ? ' active' : i + 1 < this._cur ? ' done' : '');
        });
      };
      this.go   = (n) => { const p = this._cur; this._cur = Math.min(Math.max(1, n), this._total); upd(); this.emit('upao-nav-change', { index: this._cur, prev: p }); };
      this.next = ()  => this.go(this._cur + 1);
      this.prev = ()  => this.go(this._cur - 1);
      this.$('#next').addEventListener('click', () => this.next());
      this.$('#prev').addEventListener('click', () => this.prev());
      this.$$('.dot').forEach(d => d.addEventListener('click', () => this.go(+d.dataset.i)));
      upd();
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     9. upao-comic-panel  —  Comic strip panel
     Attrs: number, character, img-src, img-alt, bubble-side ("left"|"right")
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOComicPanel extends UE {
    connectedCallback() {
      const num    = this.getAttribute('number')      || '1';
      const char   = this.getAttribute('character')   || 'Max';
      const src    = this.getAttribute('img-src')     || '';
      const alt    = this.getAttribute('img-alt')     || char;
      const side   = this.getAttribute('bubble-side') || 'right';
      const left   = side === 'left';
      this.shadowRoot.innerHTML = this.css(`
        .panel{background:${T.surface};border:2.5px solid ${T.primary};
          border-radius:${T.radius};overflow:hidden;box-shadow:4px 4px 0 ${T.primary};
          animation:upao-scale .35s ${T.ease} both;position:relative}
        .num-badge{position:absolute;top:10px;left:10px;z-index:2;
          background:${T.accent};color:#fff;font-family:${T.fontDisp};
          font-weight:700;font-size:.8rem;width:28px;height:28px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          border:2px solid #fff}
        .img-wrap{background:${T.surfTint};min-height:120px;display:flex;
          align-items:center;justify-content:center;border-bottom:2px solid ${T.border};overflow:hidden}
        .img-wrap img{max-width:100%;max-height:200px;object-fit:contain}
        .no-img{font-size:3rem;line-height:1;padding:24px;opacity:.3}
        .char-label{font-size:.7rem;font-weight:700;text-transform:uppercase;
          letter-spacing:.1em;color:${T.muted};padding:8px 14px 0}
        .bubble{margin:8px 14px 16px;padding:12px 14px;
          background:${T.surfTint};border-radius:${left ? `4px ${T.radiusSm} ${T.radiusSm} ${T.radiusSm}` : `${T.radiusSm} 4px ${T.radiusSm} ${T.radiusSm}`};
          border:1.5px solid ${T.primary};font-size:.95rem;line-height:1.55;
          color:${T.text};position:relative}
        .bubble::before{content:'';position:absolute;top:-8px;
          ${left ? 'left:12px' : 'right:12px'};
          border:8px solid transparent;border-bottom-color:${T.primary};
          border-top:none}
        .bubble::after{content:'';position:absolute;top:-6px;
          ${left ? 'left:13px' : 'right:13px'};
          border:7px solid transparent;border-bottom-color:${T.surfTint};
          border-top:none}
      `) + `
      <div class="panel" role="figure">
        <div class="num-badge" aria-label="Panel ${num}">${num}</div>
        <div class="img-wrap">
          ${src ? `<img src="${src}" alt="${alt}" loading="lazy">` : `<div class="no-img" aria-hidden="true">🤖</div>`}
        </div>
        <p class="char-label">${char}</p>
        <div class="bubble"><slot></slot></div>
      </div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     10. upao-podcast  —  Audio player with animated waveform
     Attrs: src (base64 data URI), concept, transcript
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOPodcast extends UE {
    connectedCallback() {
      const src        = this.getAttribute('src')        || '';
      const concept    = this.getAttribute('concept')    || 'Micro-Podcast';
      const transcript = this.getAttribute('transcript') || '';
      const bars = Array.from({ length: 7 }, (_, i) =>
        `<div class="bar" style="animation-delay:${i * .13}s"></div>`).join('');
      this.shadowRoot.innerHTML = this.css(`
        .card{background:${T.surface};border-radius:${T.radius};
          box-shadow:${T.shadow};overflow:hidden;animation:upao-in .35s ${T.ease} both}
        .head{background:${T.primary};padding:18px 22px;display:flex;align-items:center;gap:14px}
        .mic{font-size:1.8rem}
        .htitle{font-family:${T.fontDisp};font-size:1rem;font-weight:700;color:#fff}
        .hsub{font-size:.75rem;color:rgba(255,255,255,.65);margin-top:2px}
        .body{padding:20px 22px}
        .wave{display:flex;align-items:flex-end;justify-content:center;gap:4px;
          height:44px;margin:14px 0}
        .bar{width:6px;border-radius:3px;background:${T.accent};height:5px;
          animation:upao-wave 1.1s ease-in-out infinite;animation-play-state:paused}
        .playing .bar{animation-play-state:running}
        .controls{display:flex;gap:10px;justify-content:center;margin:6px 0 12px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:11px 22px;
          border-radius:${T.radiusSm};font-family:${T.fontBody};font-size:.92rem;
          font-weight:600;cursor:pointer;transition:all .2s ${T.ease};border:none}
        .btn.play{background:${T.accent};color:#fff}
        .btn.play:hover{background:${T.accentHv};transform:translateY(-1px)}
        .btn.ghost{background:transparent;border:2px solid ${T.accent};color:${T.accent}}
        .btn.ghost:hover{background:${T.accentTint}}
        .btn:focus-visible{outline:3px solid ${T.primary};outline-offset:2px}
        .track{height:6px;background:${T.surfTint};border-radius:3px;
          cursor:pointer;position:relative;overflow:hidden;margin-bottom:6px;
          border:1px solid ${T.border}}
        .fill{height:100%;background:${T.accent};border-radius:3px;
          width:0;transition:width .4s linear;pointer-events:none}
        .times{display:flex;justify-content:space-between;font-size:.75rem;
          color:${T.muted};margin-bottom:14px}
        .transcript{font-size:.93rem;line-height:1.7;color:${T.text};
          padding:14px 16px;background:${T.bg};border-radius:${T.radiusSm};
          border-left:3px solid ${T.accent}}
        .status{text-align:center;font-size:.82rem;color:${T.success};
          margin-top:10px;min-height:1.2em;font-weight:600}
      `) + `
      <div class="card">
        <div class="head">
          <span class="mic" aria-hidden="true">🎙️</span>
          <div><div class="htitle">Micro-Podcast</div><div class="hsub">${concept}</div></div>
        </div>
        <div class="body">
          ${src ? `<audio id="aud" src="${src}" preload="auto"></audio>` : ''}
          <div class="wave" id="wave">${bars}</div>
          <div class="controls">
            <button class="btn play" id="play" aria-label="Reproducir">▶ Reproducir</button>
            <button class="btn ghost" id="rep" aria-label="Repetir">↺ Repetir</button>
          </div>
          ${src ? `<div class="track" id="track" role="slider" aria-label="Progreso del audio" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="fill" id="fill"></div>
          </div>
          <div class="times"><span id="cur">0:00</span><span id="dur">0:00</span></div>` : ''}
          ${transcript ? `<div class="transcript" role="note">${transcript}</div>` : ''}
          <p class="status" id="st" aria-live="polite"></p>
        </div>
      </div>`;
      const fmt = s => `${Math.floor((s||0)/60)}:${String(Math.floor(s||0)%60).padStart(2,'0')}`;
      const aud  = this.$('#aud');
      const wave = this.$('#wave');
      const play = this.$('#play');
      const rep  = this.$('#rep');
      const fill = this.$('#fill');
      const track= this.$('#track');
      const st   = this.$('#st');
      if (!aud) {
        if (play) { play.textContent = '▶ Leer texto'; play.onclick = () => { st.textContent = '✓ Leído'; this.emit('upao-podcast-complete'); typeof _scormComplete === 'function' && _scormComplete(); }; }
        if (rep) rep.style.display = 'none';
        return;
      }
      aud.addEventListener('loadedmetadata', () => { if (this.$('#dur')) this.$('#dur').textContent = fmt(aud.duration); });
      aud.addEventListener('timeupdate', () => {
        const pct = aud.duration ? (aud.currentTime / aud.duration) * 100 : 0;
        if (fill) fill.style.width = pct + '%';
        if (this.$('#cur')) this.$('#cur').textContent = fmt(aud.currentTime);
        if (track) track.setAttribute('aria-valuenow', Math.round(pct));
      });
      aud.addEventListener('play',  () => { play.textContent = '⏸ Pausar'; wave?.classList.add('playing'); });
      aud.addEventListener('pause', () => { play.textContent = '▶ Reproducir'; wave?.classList.remove('playing'); });
      aud.addEventListener('ended', () => {
        play.textContent = '▶ Reproducir'; wave?.classList.remove('playing');
        st.textContent = '✓ Podcast escuchado';
        this.emit('upao-podcast-complete');
        typeof G._scormComplete === 'function' && G._scormComplete();
      });
      play.addEventListener('click', () => aud.paused ? aud.play() : aud.pause());
      rep.addEventListener('click',  () => { aud.currentTime = 0; aud.play(); });
      if (track) track.addEventListener('click', e => {
        const r = track.getBoundingClientRect();
        aud.currentTime = ((e.clientX - r.left) / r.width) * aud.duration;
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     11a. upao-drag-item  —  Draggable item
     Attrs: item-id, category, value
     ══════════════════════════════════════════════════════════════════════ */
  class UPAODragItem extends UE {
    connectedCallback() {
      const cat = this.getAttribute('category') || '';
      const id  = this.getAttribute('item-id')  || '';
      this.shadowRoot.innerHTML = this.css(`
        .item{padding:11px 16px;border:2px solid ${T.border};border-radius:${T.radiusSm};
          background:${T.surface};cursor:grab;font-size:.93rem;font-weight:500;
          transition:all .2s ${T.ease};display:flex;align-items:center;gap:8px;
          user-select:none;box-shadow:0 2px 6px rgba(10,61,145,.06)}
        .item:hover{border-color:${T.primary};background:${T.surfTint};
          transform:translateY(-2px);box-shadow:${T.shadow}}
        .item:active{cursor:grabbing;transform:scale(.97)}
        .item.dragging{opacity:.45;transform:rotate(2deg)}
        .item.matched{border-color:${T.success};background:${T.successBg};
          cursor:default;opacity:.8}
        .item.wrong{border-color:${T.danger};background:${T.dangerBg};
          animation:upao-shake .3s ${T.ease}}
        .grip{color:${T.muted};font-size:.9rem;cursor:grab}
      `) + `
      <div class="item" draggable="true" role="listitem" tabindex="0"
        data-id="${id}" data-cat="${cat}" aria-label="Elemento: ${id}">
        <span class="grip" aria-hidden="true">⠿</span>
        <slot></slot>
      </div>`;
      const el = this.$('.item');
      el.addEventListener('dragstart', e => {
        el.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({ id, cat }));
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      this.matched = () => el.classList.add('matched');
      this.wrong   = () => el.classList.add('wrong');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     11b. upao-drop-zone  —  Drop target
     Attrs: accepts (category), label, zone-id
     Events: upao-drop { itemId, itemCat, zoneId, correct }
     ══════════════════════════════════════════════════════════════════════ */
  class UPAODropZone extends UE {
    connectedCallback() {
      const accepts = this.getAttribute('accepts') || '';
      const label   = this.getAttribute('label')   || 'Zona';
      const zoneId  = this.getAttribute('zone-id') || '';
      this.shadowRoot.innerHTML = this.css(`
        .zone{min-height:90px;border:2.5px dashed ${T.border};border-radius:${T.radius};
          background:${T.bg};transition:all .2s ${T.ease};display:flex;
          flex-direction:column;align-items:center;justify-content:center;gap:8px;
          padding:16px;text-align:center}
        .zone.over{border-color:${T.accent};background:${T.accentTint};
          transform:scale(1.02)}
        .zone.correct{border-color:${T.success};background:${T.successBg};border-style:solid}
        .zone.wrong{border-color:${T.danger};background:${T.dangerBg};
          animation:upao-shake .3s ${T.ease};border-style:solid}
        .lbl{font-weight:700;color:${T.primary};font-size:.85rem}
        .hint{font-size:.75rem;color:${T.muted}}
        .dropped{font-size:.9rem;color:${T.text};font-weight:500}
      `) + `
      <div class="zone" role="region" aria-label="Zona: ${label}" aria-dropeffect="move">
        <div class="lbl">${label}</div>
        <div class="hint" id="hint">Arrastra aquí</div>
        <div class="dropped" id="dropped" hidden></div>
      </div>`;
      const zone = this.$('.zone');
      zone.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; zone.classList.add('over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('over');
        const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        const correct = !accepts || data.cat === accepts;
        zone.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) { setTimeout(() => zone.classList.remove('wrong'), 600); }
        const dropped = this.$('#dropped');
        if (dropped && correct) { dropped.hidden = false; dropped.textContent = data.id; this.$('#hint').hidden = true; }
        this.emit('upao-drop', { itemId: data.id, itemCat: data.cat, zoneId, correct });
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     12. upao-complete  —  SCORM completion button
     Attrs: label, require-progress (int), locked
     Methods: unlock()
     Events: upao-completed
     ══════════════════════════════════════════════════════════════════════ */
  class UPAOComplete extends UE {
    connectedCallback() {
      const label   = this.getAttribute('label')   || 'Continuar →';
      const locked  = this.hasAttribute('locked') || !!this.getAttribute('require-progress');
      this.shadowRoot.innerHTML = this.css(`
        .wrap{text-align:center;padding:8px 0}
        .btn{display:inline-flex;align-items:center;gap:10px;
          padding:14px 32px;border-radius:${T.radiusSm};border:none;
          background:${T.accent};color:#fff;font-family:${T.fontBody};
          font-size:1rem;font-weight:700;cursor:pointer;letter-spacing:.02em;
          transition:all .25s ${T.ease};box-shadow:0 4px 14px rgba(244,122,32,.35)}
        .btn:hover:not([disabled]){background:${T.accentHv};
          transform:translateY(-2px);box-shadow:0 6px 20px rgba(244,122,32,.45)}
        .btn:active:not([disabled]){transform:translateY(0)}
        .btn:focus-visible{outline:3px solid ${T.primary};outline-offset:3px}
        .btn[disabled]{background:${T.border};color:${T.muted};cursor:not-allowed;
          box-shadow:none;transform:none}
        .btn.done{background:${T.success};pointer-events:none;
          animation:upao-bounce .5s ${T.ease}}
        .hint{font-size:.78rem;color:${T.muted};margin-top:8px}
      `) + `
      <div class="wrap">
        <button class="btn" id="btn"${locked ? ' disabled' : ''} aria-label="${label}">
          <span id="icon" aria-hidden="true">🏁</span> <span id="lbl">${label}</span>
        </button>
        ${locked ? `<p class="hint" id="hint" aria-live="polite">Completa la actividad para continuar</p>` : ''}
      </div>`;
      const btn = this.$('#btn');
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('done')) return;
        btn.classList.add('done');
        this.$('#lbl').textContent = '¡Completado!';
        this.$('#icon').textContent = '✓';
        this.emit('upao-completed');
        typeof G._scormComplete === 'function' && G._scormComplete();
      });
      this.unlock = () => {
        btn.disabled = false;
        const hint = this.$('#hint');
        if (hint) hint.textContent = 'Actividad completada — ya puedes continuar';
      };
      const req = parseInt(this.getAttribute('require-progress') || '0', 10);
      if (req > 0) {
        document.addEventListener('upao-progress-complete', () => this.unlock());
        document.addEventListener('upao-nav-change', e => { if (e.detail.index >= req) this.unlock(); });
      }
    }
  }

  /* ── Register all elements ──────────────────────────────────────────── */
  const DEFS = [
    ['upao-card',        UPAOCard],
    ['upao-node',        UPAONode],
    ['upao-choice',      UPAOChoice],
    ['upao-reveal',      UPAOReveal],
    ['upao-progress',    UPAOProgress],
    ['upao-timer',       UPAOTimer],
    ['upao-score',       UPAOScore],
    ['upao-nav',         UPAONav],
    ['upao-comic-panel', UPAOComicPanel],
    ['upao-podcast',     UPAOPodcast],
    ['upao-drag-item',   UPAODragItem],
    ['upao-drop-zone',   UPAODropZone],
    ['upao-complete',    UPAOComplete],
  ];
  DEFS.forEach(([name, cls]) => {
    if (!G.customElements.get(name)) G.customElements.define(name, cls);
  });

}(window));
