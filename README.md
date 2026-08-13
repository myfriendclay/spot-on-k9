# Spot-On K9 Training — website

A rebuild of [spot-onk9training.com](https://spot-onk9training.com) as a fast, self-contained
static site. No framework, no build step, no dependencies — eight HTML files, one stylesheet,
one script.

**Live preview: <https://myfriendclay.github.io/spot-on-k9/>**
(GitHub Pages, deployed from `main`. Pushing to `main` redeploys within a minute or two.)

```
index.html          Home
nyc.html            NYC packages & pricing
connecticut.html    Connecticut packages & pricing
about.html          Stephen Baum, method, credentials
videos.html         49 videos, filterable
testimonials.html   18 client testimonials
policies.html       Policies & scheduling
contact.html        Contact form, registration, gift certificates
404.html            Not found

css/styles.css      Design system — all tokens live at the top
js/main.js          Nav, video facades, filters, forms
assets/             Logo, photos, video thumbnails
build-bundle.py     Optional: bundles everything into one shareable file
_redirects          Old Squarespace URLs → new pages (Netlify format)
```

---

## Running it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. You can also just double-click `index.html` — everything
works from the filesystem.

---

## Deploying

The site is plain static files. It's currently on **GitHub Pages** — `git push` to `main` and
it redeploys. Any of these also work:

- **Netlify** — drag the folder onto <https://app.netlify.com/drop>. `_redirects` is picked up automatically.
- **Vercel** — `vercel deploy` from this directory.
- **GitHub Pages** — push the folder to a repo, enable Pages on the branch.
- **Existing host** — upload by FTP. Nothing server-side is required.

### Pointing the real domain at it

1. Deploy and confirm the preview URL works.
2. Add `spot-onk9training.com` as a custom domain in the host's dashboard.
3. Update the DNS records at the registrar as instructed by the host.
4. Keep the Squarespace store live — the **Register & pay** buttons still link to it.

### Redirects

`_redirects` maps every old Squarespace URL to its new home so existing Google results and
inbound links don't break. It's in Netlify's format; on Apache, translate it to `.htaccess`
`Redirect 301` lines, and on Vercel to a `redirects` array in `vercel.json`.

---

## Connecting the forms

The contact form validates and shows proper error/success states, but **it won't deliver mail
until you give it an endpoint.** Pick one:

### Formspree (works on any host)

1. Sign up free at <https://formspree.io> and create a form.
2. Copy the endpoint it gives you (looks like `https://formspree.io/f/abcdwxyz`).
3. Open `js/main.js` and set it on line ~20:

   ```js
   const FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
   ```

### Netlify Forms (only if hosting on Netlify)

1. Leave `FORM_ENDPOINT` empty.
2. Add `data-netlify="true"` and `name="contact"` to the `<form>` tag in `contact.html`.
3. Redeploy. Submissions appear under **Forms** in the Netlify dashboard.

The form already includes a honeypot field (`_gotcha`) that both services recognise, so bot
submissions get dropped silently.

---

## Editing the site

**Prices** live in `nyc.html` and `connecticut.html`, inside `.pkg__prices` blocks:

```html
<span class="price-chip"><span class="price-chip__n">4 classes</span><span class="price-chip__v">$1,024</span></span>
```

Also update the `hasOfferCatalog` JSON-LD in the same file's `<head>` so search engines see
the same numbers.

**Colours, spacing and type** are all CSS custom properties at the top of `css/styles.css`.
Changing `--brand-700` recolours the whole site. Dark mode is defined in the two blocks
immediately below — they must stay in sync.

**Testimonials** are `<blockquote class="quote">` elements in `testimonials.html`. For a long
one, wrap the overflow in `<span class="quote__more">…</span>` and add the toggle button; it
collapses automatically.

**Videos** are `<article class="video-card" data-cat="…">` in `videos.html`. To add one:

1. Save a 16:9 thumbnail as `assets/thumbs/yt-<youtube-id>.webp`. The `yt-` prefix matters:
   YouTube IDs can start with `_` or `-`, and GitHub Pages refuses to serve paths beginning
   with an underscore.
2. Copy an existing card, change `data-video`, `data-title`, the `<img src>` and the heading.
3. Set `data-cat` to one of `reactivity`, `recall`, `group`, `obedience`, `testimonial`.
4. Bump the count in that category's filter chip.

Nothing is requested from YouTube until a visitor clicks play.

---

## The shareable single-file build

`build-bundle.py` flattens the whole site into one HTML file — CSS and JS inlined, every image
converted to a data URI, all eight pages behind a small hash router. It's for previewing and
sharing on hosts that only accept a single page.

```bash
python3 build-bundle.py     # → dist/spot-on-k9-preview.html (~4 MB)
```

**This is not what you deploy.** The real site is the multi-page version in this folder — it
loads far faster, and each page gets its own URL and meta tags for search.

---

## Content notes from the rebuild

Carried over from the old site: every package and price, all policies, credentials, all 49
videos, and all client testimonials.

Removed as outdated:

- COVID-era social-distancing and face-mask rules
- The client survey that closed 10/31/2025, and a 2022 group-class survey
- `new-york-training-copy`, a superseded duplicate of the training page
- `products-test`, a test page that was exposed in the sitemap
- Nav links to `/faq`, `/gallery` and `/home-2`, all of which 404'd

Added, because it existed in the store but not on the site:

- **Serious Aggression Rehab (SARC)** — now a proper package on both training pages
- **NYC Puppy 101** — was purchasable but absent from the NYC page

### Three things to double-check

These were inconsistent in the old site. Current values:

| Item | Used here | Note |
|---|---|---|
| CT Google reviews | 13 | Home page said 12, CT page said 13 |
| Temperature cutoff | below 34°F / above 84°F | Policies page said 82°F, training pages said 84°F |
| CT 5-class price | $1,108 | Breaks the per-class pattern — $1,180 would fit. Published as-is |
