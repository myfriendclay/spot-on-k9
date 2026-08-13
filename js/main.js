/* Spot-On K9 Training — site behaviour
   No dependencies. Every feature degrades gracefully without JS. */

/* ---------------------------------------------------------------------------
   FORM ENDPOINT
   Put your form provider's endpoint here to make the forms deliver mail.

   Formspree ....... https://formspree.io  → "https://formspree.io/f/xxxxxxxx"
   Web3Forms ....... https://web3forms.com → "https://api.web3forms.com/submit"
                     (also add your access key as a hidden input in the form)
   Netlify Forms ... leave this empty, add data-netlify="true" to each <form>,
                     and host the site on Netlify.

   Until this is filled in, forms validate and show a fallback message that
   points people at the phone number and email address.
--------------------------------------------------------------------------- */
const FORM_ENDPOINT = '';

(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* --- Mobile navigation ------------------------------------------------ */
  const toggle = $('.nav-toggle');
  const nav    = $('#primary-nav');

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.dataset.open = String(open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (!e.target.closest('#primary-nav') && !e.target.closest('.nav-toggle')) setOpen(false);
    });

    // Reset when returning to the desktop layout
    const mq = window.matchMedia('(min-width: 1051px)');
    mq.addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* --- Header shadow on scroll ------------------------------------------ */
  const header = $('.site-header');
  if (header) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel);
    new IntersectionObserver(
      ([entry]) => { header.dataset.stuck = String(!entry.isIntersecting); },
      { threshold: 0 }
    ).observe(sentinel);
  }

  /* --- Scroll reveal ----------------------------------------------------- */
  const reveals = $$('.reveal');
  if (reveals.length) {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      reveals.forEach((el) => io.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add('is-in'));
    }
  }

  /* --- YouTube facades ---------------------------------------------------
     Nothing is requested from YouTube until someone actually clicks play. */
  $$('.facade').forEach((facade) => {
    facade.addEventListener('click', function handle() {
      const id = facade.dataset.video;
      if (!id) return;
      const title = facade.dataset.title || 'Video';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      facade.replaceChildren(iframe);
      facade.removeEventListener('click', handle);
    }, { once: true });
  });

  /* --- Video category filter --------------------------------------------- */
  const chipBar = $('[data-filter-bar]');
  if (chipBar) {
    // Scope to this bar's own grid — the chips also carry data-cat, and other
    // pages/routes can hold video cards we must not touch.
    const grid   = chipBar.parentElement.querySelector('.video-grid');
    const cards  = grid ? $$('.video-card[data-cat]', grid) : [];
    const status = $('#filter-status');

    const apply = (chip) => {
      const cat = chip.dataset.cat;
      $$('.chip', chipBar).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));

      let shown = 0;
      cards.forEach((card) => {
        const match = cat === 'all' || card.dataset.cat === cat;
        card.hidden = !match;
        if (match) shown += 1;
      });

      if (status) {
        status.textContent = `Showing ${shown} video${shown === 1 ? '' : 's'}` +
          (cat === 'all' ? '' : ` in ${chip.dataset.label || chip.textContent.trim()}`);
      }
    };

    chipBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) apply(chip);
    });

    // Deep link: videos.html?cat=recall opens with that filter already applied
    const wanted = new URLSearchParams(location.search).get('cat');
    if (wanted) {
      const chip = $(`.chip[data-cat="${CSS.escape(wanted)}"]`, chipBar);
      if (chip) apply(chip);
    }
  }

  /* --- Expandable testimonials ------------------------------------------- */
  $$('.quote__toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const quote = btn.closest('.quote');
      const open  = quote.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* --- Forms -------------------------------------------------------------
     Native validation drives the required-field messaging; we only take over
     the submit so the page doesn't navigate away. */
  $$('form[data-form]').forEach((form) => {
    const status  = $('.form__status', form);
    const submit  = $('[type="submit"]', form);
    const idle    = submit ? submit.textContent : '';

    const say = (msg, kind) => {
      if (!status) return;
      status.hidden = false;
      status.className = `form__status form__status--${kind}`;
      status.innerHTML = msg;
      status.setAttribute('role', kind === 'err' ? 'alert' : 'status');
      status.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    // Clear a field's error as soon as it becomes valid again
    $$('input, select, textarea', form).forEach((input) => {
      input.addEventListener('input', () => {
        if (input.checkValidity()) {
          input.removeAttribute('aria-invalid');
          const err = input.parentElement.querySelector('.error');
          if (err) err.textContent = '';
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot — silently accept and drop bot submissions
      if (form.querySelector('.hp input')?.value) { say('Thank you.', 'ok'); form.reset(); return; }

      let firstBad = null;
      $$('input, select, textarea', form).forEach((input) => {
        const err = input.parentElement.querySelector('.error');
        if (input.checkValidity()) {
          input.removeAttribute('aria-invalid');
          if (err) err.textContent = '';
        } else {
          input.setAttribute('aria-invalid', 'true');
          if (err) err.textContent = input.validationMessage;
          if (!firstBad) firstBad = input;
        }
      });

      if (firstBad) {
        firstBad.focus();
        say('Please check the highlighted fields and try again.', 'err');
        return;
      }

      if (!FORM_ENDPOINT) {
        say(
          'This form isn\'t connected to an inbox yet. Please email ' +
          '<a href="mailto:stephen@spot-onk9training.com">stephen@spot-onk9training.com</a> ' +
          'or call <a href="tel:+19178483108">917-848-3108</a> — Stephen usually replies the same day.',
          'err'
        );
        return;
      }

      if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(res.statusText);
        form.reset();
        say(
          '<strong>Thank you — your message is on its way.</strong><br>' +
          'Stephen replies to most enquiries the same day. If it\'s urgent, call 917-848-3108.',
          'ok'
        );
      } catch (err) {
        say(
          'Something went wrong sending that. Please email ' +
          '<a href="mailto:stephen@spot-onk9training.com">stephen@spot-onk9training.com</a> ' +
          'or call <a href="tel:+19178483108">917-848-3108</a>.',
          'err'
        );
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = idle; }
      }
    });
  });

  /* --- Current year ------------------------------------------------------ */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
