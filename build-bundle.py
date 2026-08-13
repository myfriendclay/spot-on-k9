#!/usr/bin/env python3
"""
Bundle the multi-page static site into ONE self-contained HTML file.

Why: hosts like Claude Artifacts serve a single page with a strict CSP that
blocks every external request. This inlines the CSS and JS, turns every image
into a data: URI, and stitches the pages together behind a tiny hash router so
the whole site can be shared from a single link.

The real site in this folder stays a normal multi-page site — this is only for
preview/sharing. Run:  python3 build-bundle.py
"""

import base64
import html as html_mod
import json
import mimetypes
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'dist', 'spot-on-k9-preview.html')

PAGES = [
    ('index',        'index.html',        'Home'),
    ('nyc',          'nyc.html',          'NYC Training'),
    ('connecticut',  'connecticut.html',  'Connecticut'),
    ('about',        'about.html',        'About'),
    ('videos',       'videos.html',       'Videos'),
    ('testimonials', 'testimonials.html', 'Reviews'),
    ('policies',     'policies.html',     'Policies'),
    ('contact',      'contact.html',      'Contact'),
    ('notfound',     '404.html',          'Not found'),
]

_asset_cache = {}


def data_uri(path):
    """Read an asset off disk and return it as a data: URI (cached)."""
    if path in _asset_cache:
        return _asset_cache[path]
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full):
        raise FileNotFoundError(path)
    mime = mimetypes.guess_type(full)[0] or 'application/octet-stream'
    with open(full, 'rb') as fh:
        uri = 'data:%s;base64,%s' % (mime, base64.b64encode(fh.read()).decode())
    _asset_cache[path] = uri
    return uri


def prefer_webp(html):
    """Collapse <picture> down to the WebP source only.

    The real site keeps a JPEG fallback, but inlining both would double the
    bundle's image weight for no benefit — every browser that can open a
    9 MB data-URI page can decode WebP.
    """
    def repl(m):
        webp, tag = m.group(1), m.group(2)
        return re.sub(r'src="assets/photos/[^"]+"', 'src="%s"' % webp, tag)

    return re.sub(
        r'<picture>\s*<source srcset="(assets/photos/[^"]+\.webp)" type="image/webp">\s*(<img\b[^>]*>)\s*</picture>',
        repl, html, flags=re.S)


def inline_assets(html):
    """Swap every assets/... reference for its data: URI."""
    def repl(m):
        try:
            return m.group(1) + data_uri(m.group(2)) + m.group(3)
        except FileNotFoundError:
            print('  ! missing asset:', m.group(2))
            return m.group(0)
    return re.sub(r'(src="|srcset="|href=")(assets/[^"]+)(")', repl, html)


PAGE_SLUGS = {f: s for s, f, _ in PAGES}


def rewrite_links(html):
    """foo.html -> #/foo, foo.html#anchor -> #/foo/anchor, index.html -> #/"""
    def repl(m):
        file, frag = m.group(1), m.group(2) or ''
        slug = PAGE_SLUGS.get(file)
        if slug is None:
            return m.group(0)
        if frag:
            return 'href="#/%s/%s"' % ('' if slug == 'index' else slug, frag.lstrip('#'))
        return 'href="#/"' if slug == 'index' else 'href="#/%s"' % slug

    html = re.sub(r'href="([a-z0-9-]+\.html)(#[A-Za-z0-9_-]+)?"', repl, html)
    # videos.html?cat=x links
    html = re.sub(r'href="videos\.html\?[^"]*"', 'href="#/videos"', html)
    return html


def main():
    styles = open(os.path.join(ROOT, 'css', 'styles.css')).read()
    script = open(os.path.join(ROOT, 'js', 'main.js')).read()
    index = open(os.path.join(ROOT, 'index.html')).read()

    # Header, footer and mobile CTA are identical everywhere — take one copy.
    header = re.search(r'<header class="site-header">.*?</header>', index, re.S).group(0)
    footer = re.search(r'<footer class="site-footer">.*?</footer>', index, re.S).group(0)
    cta    = re.search(r'<div class="mobile-cta">.*?</div>\s*(?=<script)', index, re.S).group(0)

    routes, titles = [], {}
    for slug, filename, label in PAGES:
        raw = open(os.path.join(ROOT, filename)).read()
        # unescape — this becomes document.title, which is plain text
        titles[slug] = html_mod.unescape(
            re.search(r'<title>(.*?)</title>', raw, re.S).group(1).strip())
        main_html = re.search(r'<main id="main">(.*?)</main>', raw, re.S).group(1)
        routes.append(
            '<div class="route" id="route-%s" data-label="%s" hidden>%s</div>'
            % (slug, label, main_html)
        )
        print('  + %-13s %6.1f KB' % (slug, len(main_html) / 1024))

    body = '\n'.join([
        '<a class="skip-link" href="#main">Skip to content</a>',
        header,
        '<main id="main">',
        '\n'.join(routes),
        '</main>',
        footer,
        cta,
    ])

    body = inline_assets(prefer_webp(rewrite_links(body)))

    router = """
/* --- Hash router (preview bundle only) ------------------------------------
   The deployed site is a normal multi-page site; this exists so the whole
   thing can live behind one shareable URL. */
(function () {
  var TITLES = %s;
  var routes = Array.prototype.slice.call(document.querySelectorAll('.route'));

  function paint() {
    var raw = (location.hash || '#/').replace(/^#\\/?/, '');
    var parts = raw.split('/');
    var slug = parts[0] || 'index';
    var anchor = parts[1] || '';

    var target = document.getElementById('route-' + slug) || document.getElementById('route-notfound');
    routes.forEach(function (r) { r.hidden = r !== target; });

    document.title = TITLES[slug] || TITLES.notfound;

    // Mark the active nav item
    var want = slug === 'index' ? '#/' : '#/' + slug;
    document.querySelectorAll('#primary-nav a').forEach(function (a) {
      if (a.getAttribute('href') === want) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // Anything hidden never fired its IntersectionObserver — just show it.
    target.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });

    if (anchor) {
      var el = target.querySelector('#' + CSS.escape(anchor));
      if (el) { el.scrollIntoView({ block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', paint);
  paint();
})();
""" % json.dumps(titles)

    page = '\n'.join([
        '<title>Spot-On K9 Training — new site preview</title>',
        '<style>\n' + styles + '\n</style>',
        body,
        '<script>\n' + script + '\n' + router + '\n</script>',
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as fh:
        fh.write(page)
    print('\n  -> %s  (%.2f MB)' % (OUT, os.path.getsize(OUT) / 1024 / 1024))


if __name__ == '__main__':
    main()
