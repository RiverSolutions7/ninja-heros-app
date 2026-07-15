class Component extends DCLogic {
  // ---------- recording rig (8c) — baked ----------
  cfg = { bloom: 190, stagger: 28, bounce: 0, xfade: 280 };
  mode = 'recording'; // 'idle' | 'in' | 'recording' | 'out'
  rafId = null;
  timeouts = [];

  placeholderRef = React.createRef();
  barsRef = React.createRef();
  timerRef = React.createRef();
  buttonRef = React.createRef();
  micGlyphRef = React.createRef();
  checkGlyphRef = React.createRef();

  // ---------- develop rig (8d) — baked ----------
  dvCfg = { total: 940, stagger: 105, settle: 8, scrim: 1 };
  dvTimeouts = [];
  dvScrim = React.createRef();
  dvLabel = React.createRef();
  dvTitle = React.createRef();
  dvStep1 = React.createRef();
  dvStep2 = React.createRef();
  dvMore = React.createRef();
  dvChips = React.createRef();

  // ---------- save morph (8d developed card -> celebrate library thumb) ----------
  // baked spring: duration 390ms, overshoot 0.1 (damping ratio ~0.591). Real trigger only.
  msMode = 'idle';
  msRaf = null;
  msScreen = React.createRef();
  msCard = React.createRef();
  msOverlay = React.createRef();
  msHeader = React.createRef();
  msDots = React.createRef();
  msDock = React.createRef();
  msCeleb = React.createRef();
  msCelebBg = React.createRef();
  msCelebInner = React.createRef();
  msCheck = React.createRef();
  msThumbSlot = React.createRef();

  renderVals() {
    return {
      placeholderRef: this.placeholderRef, barsRef: this.barsRef, timerRef: this.timerRef,
      buttonRef: this.buttonRef, micGlyphRef: this.micGlyphRef, checkGlyphRef: this.checkGlyphRef,
      onButtonTap: () => this.onButtonTap(),

      dvScrim: this.dvScrim, dvLabel: this.dvLabel, dvTitle: this.dvTitle,
      dvStep1: this.dvStep1, dvStep2: this.dvStep2, dvMore: this.dvMore, dvChips: this.dvChips,

      msScreen: this.msScreen, msCard: this.msCard, msOverlay: this.msOverlay,
      msHeader: this.msHeader, msDots: this.msDots, msDock: this.msDock,
      msCeleb: this.msCeleb, msCelebBg: this.msCelebBg, msCelebInner: this.msCelebInner,
      msCheck: this.msCheck, msThumbSlot: this.msThumbSlot,
      onSaveTap: () => this.onSaveTap(),
    };
  }

  reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  clearTimers() { this.timeouts.forEach(clearTimeout); this.timeouts = []; }
  after(fn, ms) { this.timeouts.push(setTimeout(fn, ms)); }
  bars() { return this.barsRef.current ? Array.from(this.barsRef.current.children) : []; }
  set(ref, styles) { if (ref.current) Object.assign(ref.current.style, styles); }
  text(ref, t) { if (ref.current) ref.current.textContent = t; }
  fade(el, to, dur, delay) {
    if (!el) return;
    el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: String(to) }], { duration: dur, delay: delay || 0, easing: 'ease', fill: 'backwards' });
    el.style.opacity = String(to);
  }

  componentDidMount() {
    // recording clock survives tab-away; nothing runs until the mic button is tapped
    this.onVis = () => {
      if (document.hidden) { this.stopTick(); }
      else if (this.mode === 'recording' && this.tickActive) { this.startTick(this.tickBase); }
    };
    document.addEventListener('visibilitychange', this.onVis);
  }
  componentWillUnmount() {
    document.removeEventListener('visibilitychange', this.onVis);
    this.stopTick(); this.clearTimers(); this.dvClearTimers();
    if (this.msRaf) cancelAnimationFrame(this.msRaf);
  }

  // ---------- save morph beats (real trigger: Save to library tap in 8d) ----------
  msSpring(t) {
    if (t >= 1) return 1;
    const zeta = 0.591, wn = 6.6, wd = wn * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta * wn / wd) * Math.sin(wd * t));
  }
  msTargetGeom() {
    const slot = this.msThumbSlot.current, screen = this.msScreen.current;
    const sr = screen.getBoundingClientRect();
    const scale = sr.width / 390 || 1;
    const r = slot.getBoundingClientRect();
    return { left: (r.left - sr.left) / scale, top: (r.top - sr.top) / scale, w: r.width / scale, h: r.height / scale, r: 10 };
  }
  msApplyGeom(g) {
    const c = this.msCard.current; if (!c) return;
    c.style.left = g.left + 'px'; c.style.top = g.top + 'px';
    c.style.width = g.w + 'px'; c.style.height = g.h + 'px';
    c.style.borderRadius = g.r + 'px';
  }
  msShadowStr(p) {
    const oy = 24 + (4 - 24) * p, bl = 60 + (10 - 60) * p, a = Math.max(0, 0.55 + (0 - 0.55) * p);
    return '0 ' + oy.toFixed(1) + 'px ' + bl.toFixed(1) + 'px rgba(0,0,0,' + a.toFixed(3) + ')';
  }
  msShadow(p) {
    const c = this.msCard.current; if (c) c.style.boxShadow = this.msShadowStr(p);
  }
  msFadeOut() {
    [this.msHeader, this.msDots, this.msDock, this.msOverlay].forEach(rf => {
      const el = rf.current; if (!el) return;
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease', fill: 'forwards' });
    });
  }
  msRunCeleb() {
    const bg = this.msCelebBg.current, celeb = this.msCeleb.current, inner = this.msCelebInner.current, check = this.msCheck.current;
    if (bg) { bg.style.opacity = '1'; bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 80, easing: 'ease', fill: 'backwards' }); }
    if (celeb) { celeb.style.opacity = '1'; celeb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120, easing: 'ease', fill: 'backwards' }); }
    if (inner) { inner.animate([{ transform: 'translateY(14px)' }, { transform: 'translateY(0px)' }], { duration: 420, delay: 120, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'backwards' }); }
    if (check) { check.animate([{ transform: 'scale(0.5)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: 200, easing: 'cubic-bezier(0.34,1.4,0.64,1)', fill: 'backwards' }); }
  }
  onSaveTap() {
    if (this.msMode !== 'idle') return;
    const card = this.msCard.current, screen = this.msScreen.current, slot = this.msThumbSlot.current;
    if (!card || !screen || !slot) return;
    this.msMode = 'run';
    const start = { left: 8, top: 92, w: 374, h: 374, r: 20 };
    const end = this.msTargetGeom();

    if (this.reducedMotion()) {
      // degrade to a crossfade — no geometry animation
      this.msFadeOut();
      this.msApplyGeom(end); this.msShadow(1);
      const bg = this.msCelebBg.current, celeb = this.msCeleb.current;
      if (bg) { bg.style.opacity = '1'; bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 120, fill: 'backwards' }); }
      if (celeb) { celeb.style.opacity = '1'; celeb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 140, fill: 'backwards' }); }
      this.msMode = 'done';
      return;
    }

    this.msFadeOut();
    this.msRunCeleb();

    // one continuous grow-morph, sampled from the baked spring into WAAPI keyframes
    // (WAAPI runs on the document timeline — unaffected by rAF throttling)
    const N = 32, kf = [];
    for (let i = 0; i <= N; i++) {
      const p = this.msSpring(i / N);
      kf.push({
        left: (start.left + (end.left - start.left) * p) + 'px',
        top: (start.top + (end.top - start.top) * p) + 'px',
        width: (start.w + (end.w - start.w) * p) + 'px',
        height: (start.h + (end.h - start.h) * p) + 'px',
        borderRadius: (start.r + (end.r - start.r) * p) + 'px',
        boxShadow: this.msShadowStr(Math.min(1, p))
      });
    }
    // land exactly on the thumb slot
    this.msApplyGeom(end); this.msShadow(1);
    const anim = card.animate(kf, { duration: 390, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => { this.msMode = 'done'; };
  }

  // ---------- recording beats (real trigger: mic button tap in 8c) ----------
  onButtonTap() {
    if (this.mode === 'idle') this.beatIn(1);
    else if (this.mode === 'recording') this.beatOut(1);
  }

  beatIn(factor) {
    if (this.mode !== 'idle') return;
    this.mode = 'in';
    const { bloom, stagger, bounce, xfade } = this.cfg;
    const bars = this.bars();
    const n = bars.length;

    if (this.reducedMotion()) {
      const d = 200 * factor;
      this.fade(this.placeholderRef.current, 0, d);
      this.fade(this.micGlyphRef.current, 0, d);
      this.fade(this.checkGlyphRef.current, 1, d);
      bars.forEach(b => { b.style.transform = 'scaleY(1)'; this.fade(b, 1, d); });
      this.fade(this.timerRef.current, 1, d, d);
      this.after(() => { this.mode = 'recording'; this.beginTimer(); }, d * 2);
      return;
    }

    this.fade(this.placeholderRef.current, 0, xfade * factor);
    this.fade(this.micGlyphRef.current, 0, xfade * factor);
    this.fade(this.checkGlyphRef.current, 1, xfade * factor);

    bars.forEach((b, i) => {
      const delay = (n - 1 - i) * stagger * factor; // nearest to button (rightmost) first
      b.style.transform = 'scaleY(1) translateX(0px)';
      b.style.opacity = '1';
      b.animate([
        { transform: 'scaleY(0) translateX(10px)', opacity: 0 },
        { transform: 'scaleY(' + (1 + bounce) + ') translateX(-1px)', opacity: 1, offset: 0.68 },
        { transform: 'scaleY(1) translateX(0px)', opacity: 1 }
      ], { duration: bloom * factor, delay: delay, easing: 'cubic-bezier(0.34,1.2,0.64,1)', fill: 'backwards' });
    });

    const total = ((n - 1) * stagger + bloom) * factor;
    this.fade(this.timerRef.current, 1, 160 * factor, total * 0.75); // timer last
    this.after(() => { this.mode = 'recording'; this.beginTimer(); }, total);
  }

  beatOut(factor) {
    if (this.mode !== 'recording') return;
    this.mode = 'out';
    this.stopTick(); this.tickActive = false;
    const { bloom, stagger, xfade } = this.cfg;
    const bars = this.bars();
    const n = bars.length;

    if (this.reducedMotion()) {
      const d = 200 * factor;
      this.fade(this.timerRef.current, 0, d);
      bars.forEach(b => this.fade(b, 0, d));
      this.fade(this.checkGlyphRef.current, 0, d, d);
      this.fade(this.micGlyphRef.current, 1, d, d);
      this.fade(this.placeholderRef.current, 1, d, d);
      this.after(() => { this.mode = 'idle'; }, d * 2);
      return;
    }

    this.fade(this.timerRef.current, 0, 140 * factor); // timer out first
    const dur = bloom * 0.7;
    bars.forEach((b, i) => {
      const delay = i * stagger * 0.8 * factor; // farthest first, sweeping toward the button
      b.style.transform = 'scaleY(0) translateX(10px)';
      b.style.opacity = '0';
      b.animate([
        { transform: 'scaleY(1) translateX(0px)', opacity: 1 },
        { transform: 'scaleY(0) translateX(10px)', opacity: 0 }
      ], { duration: dur * factor, delay: delay, easing: 'cubic-bezier(0.55,0,0.85,0.4)', fill: 'backwards' });
    });
    const barsTotal = ((n - 1) * stagger * 0.8 + dur) * factor;
    this.fade(this.checkGlyphRef.current, 0, xfade * factor, barsTotal * 0.6);
    this.fade(this.micGlyphRef.current, 1, xfade * factor, barsTotal * 0.6);
    this.fade(this.placeholderRef.current, 1, 180 * factor, barsTotal * 0.7);
    this.after(() => { this.mode = 'idle'; }, barsTotal + xfade * factor);
  }

  // ---------- recording timer (rAF, visibility-gated) ----------
  beginTimer() { this.tickActive = true; this.tickBase = 0; this.startTick(0); }
  startTick(baseSec) {
    this.stopTick();
    const t0 = performance.now() - baseSec * 1000;
    const loop = () => {
      if (document.hidden || !this.tickActive || this.mode !== 'recording') { this.rafId = null; return; }
      const s = (performance.now() - t0) / 1000;
      this.tickBase = s;
      this.text(this.timerRef, Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'));
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
  stopTick() { if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }

  // ---------- develop reveal (8d) — baked, resolves the developed card on its real trigger ----------
  dvEls() { return [this.dvLabel, this.dvTitle, this.dvStep1, this.dvStep2, this.dvMore, this.dvChips].map(r => r.current).filter(Boolean); }
  dvClearTimers() { this.dvTimeouts.forEach(clearTimeout); this.dvTimeouts = []; }
  dvAfter(fn, ms) { this.dvTimeouts.push(setTimeout(fn, ms)); }
  dvStage() {
    // recording-done resting photo: content hidden, deep scrim off
    this.dvClearTimers();
    const s = this.dvScrim.current;
    if (s) { s.getAnimations().forEach(a => a.cancel()); s.style.opacity = '0'; }
    this.dvEls().forEach(el => { el.getAnimations().forEach(a => a.cancel()); el.style.opacity = '0'; el.style.transform = 'none'; });
  }
  dvReveal(factor) {
    const { total, stagger, settle, scrim } = this.dvCfg;
    const els = this.dvEls();
    const s = this.dvScrim.current;

    if (this.reducedMotion()) {
      const d = 250 * factor;
      if (s) { s.style.opacity = String(scrim); this.fade(s, scrim, d); }
      els.forEach(el => { el.style.transform = 'none'; this.fade(el, 1, d); });
      return;
    }

    // scrim deepens first
    if (s) {
      s.style.opacity = String(scrim);
      s.animate([{ opacity: 0 }, { opacity: scrim }], { duration: total * 0.4 * factor, easing: 'ease-out', fill: 'backwards' });
    }
    // elements resolve on: dim→crisp, small upward settle
    els.forEach((el, i) => {
      const delay = (total * 0.25 + i * stagger) * factor;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0px)';
      el.animate([
        { opacity: 0, transform: 'translateY(' + settle + 'px)' },
        { opacity: 0.55, transform: 'translateY(' + (settle * 0.35) + 'px)', offset: 0.55 },
        { opacity: 1, transform: 'translateY(0px)' }
      ], { duration: total * 0.55 * factor, delay: delay, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'backwards' });
    });
  }
}