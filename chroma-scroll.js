(() => {
  const main = document.querySelector('main');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!main || motion.matches || !('IntersectionObserver' in window)) return;

  const targets = {
    heading: '.sec-head',
    module: '.slide-l, .slide-r, .sec .card, .notice, .plan-swatch, .work, .step, .honest, .cta',
    photo: '.ph-reveal, .work-shot',
    text: [
      '.hero-lead', '.hero-note', '.hero-price', '.nayami-close', '.mh-tx',
      '.ws-en', '.ws-ja', '.naze-lead', '.route .box', '.riyu-item h3',
      '.work-cap .wtag', '.work-cap .t', '.work-cap .d', '.works-sub',
      '.swatch-note', '.notice strong', '.plan-name', '.plan-for', '.plan-price',
      '.prep h4', '.row-price', '.step-body h3', '.after-lead', '.honest h3',
      '.about-row dt', 'summary > span', '.cta-en', '.cta h2', '.f-en', '.f-tag'
    ].join(', ')
  };

  const pending = new Set();
  const running = new Map();
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : null;

  function loadHeading(heading) {
    const title = heading.querySelector('h2 .tx');
    const line = heading.querySelector('.sec-line');
    const original = document.createElement('span');
    original.className = 'chroma-original';
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    const text = title.textContent;
    const glyphs = segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
    const spacing = Math.min(34, 350 / Math.max(1, glyphs.length - 1));

    glyphs.forEach((character, index) => {
      const glyph = document.createElement('span');
      glyph.className = 'chroma-glyph';
      glyph.textContent = character;
      glyph.style.setProperty('--chroma-glyph-delay', `${135 + index * spacing}ms`);
      visual.append(glyph);
    });

    original.append(...title.childNodes);
    title.append(original, visual);

    return {
      endpoint: line,
      animation: 'chroma-line',
      restore() { title.replaceChildren(...original.childNodes); }
    };
  }

  function reveal(target, animate) {
    observer.unobserve(target);
    pending.delete(target);
    if (!animate) {
      delete target.dataset.chromaState;
      return;
    }
    const kind = target.dataset.chroma;
    const finish = kind === 'heading' ? loadHeading(target) : {
      endpoint: target,
      animation: `chroma-${kind}`,
      restore() {}
    };

    function complete(event) {
      if (event && (event.target !== finish.endpoint || event.animationName !== finish.animation || event.pseudoElement)) return;
      finish.endpoint.removeEventListener('animationend', complete);
      finish.endpoint.removeEventListener('animationcancel', complete);
      finish.restore();
      delete target.dataset.chromaState;
      running.delete(target);
    }

    running.set(target, complete);
    finish.endpoint.addEventListener('animationend', complete);
    finish.endpoint.addEventListener('animationcancel', complete);
    target.dataset.chromaState = 'loading';
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting, intersectionRect }) => {
      if (isIntersecting && intersectionRect.width && intersectionRect.height && pending.has(target)) {
        const focus = document.activeElement;
        const focused = focus !== document.body && (target.contains(focus) || focus?.contains(target));
        reveal(target, !motion.matches && !focused);
      }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: [0, .01] });

  for (const [kind, selector] of Object.entries(targets)) {
    main.querySelectorAll(selector).forEach(target => {
      target.dataset.chroma = kind;
      target.dataset.chromaState = 'waiting';
      pending.add(target);
      observer.observe(target);
    });
  }

  // A focused link or control must be readable immediately, including its visible labels.
  main.addEventListener('focusin', ({ target }) => {
    for (const element of pending) {
      if (element.contains(target) || target.contains(element)) reveal(element, false);
    }
    for (const [element, complete] of running) {
      if (element.contains(target) || target.contains(element)) complete();
    }
  });

  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    for (const element of pending) reveal(element, false);
    for (const complete of running.values()) complete();
  });
})();
