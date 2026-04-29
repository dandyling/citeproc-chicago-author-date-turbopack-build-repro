# Turbopack prod minifier breaks citeproc `page_mangler`

Minimal reproduction for a Next.js 16 / Turbopack prod-minifier bug that
corrupts [`citeproc-js`](https://www.npmjs.com/package/citeproc) such that
formatting a Chicago author-date bibliography for any CSL entry containing a
`page` field throws:

```
TypeError: Cannot read properties of null (reading '2')
    at f.Engine.Fun.y [as page_mangler]
    at f.Engine.processNumber
    at f.getCite
    at f.getSortKeys
    at f.Registry.setsortkeys
    at f.Engine.updateItems
    at o.a [as format]
```

`next dev` works. `next build && next start` throws. Setting
`experimental.turbopackMinify: false` in `next.config.ts` makes the prod build
work.

## Versions

- `next` 16.1.7
- `react` 19.2.3
- `@citation-js/core` 0.7.14
- `@citation-js/plugin-csl` 0.7.14
- `citeproc` 2.4.63
- Node 20.20.0

## What the page does

`app/page.tsx` is a single client component. On mount it:

1. Fetches `public/chicago-author-date.csl` (the official CSL XML, copied
   verbatim from
   [citation-style-language/styles](https://github.com/citation-style-language/styles)).
2. Registers it with `plugins.config.get('@csl').templates.add('chicago-author-date', xml)`
   — the documented `@citation-js/plugin-csl` extension point.
3. Builds a `Cite` from one CSL JSON entry that has a `page: '45-67'` field.
4. Calls `cite.format('bibliography', { template: 'chicago-author-date', ... })`.

Expected: the bibliography HTML for that one entry. Actual in prod: the
`TypeError` above.

## Reproduce

```bash
npm install
```

### 1. Show that `next dev` works (no minification)

```bash
PORT=3100 npm run dev
```

Open <http://localhost:3100>. Bibliography renders:

> Doe, Jane. 2024. *Hello World*. 45–67.

Stop the dev server.

### 2. Show that `next build && next start` throws

```bash
rm -rf .next
npm run build
PORT=3100 npm start
```

Open <http://localhost:3100>. The page shows the `TypeError`. The browser
console shows the same.

### 3. Show that disabling `turbopackMinify` fixes it

Edit `next.config.ts` and uncomment the `experimental` block so it reads:

```ts
const nextConfig: NextConfig = {
  experimental: { turbopackMinify: false },
}
```

Then:

```bash
rm -rf .next
npm run build
PORT=3100 npm start
```

Open <http://localhost:3100>. Bibliography renders correctly. Revert the
config and the build is broken again.

### 4. Verify with the headless harness (optional)

`check.cjs` is a Puppeteer script that loads the page, waits for `useEffect`
to finish, and prints the DOM error/output blocks plus any console messages
or `pageerror` events. It's how this repro was bisected.

```bash
node check.cjs http://localhost:3100/
```

It prints `--- DOM error pre ---` followed by the stack trace when the bug
fires, or `(none)` when it doesn't.

## What changes between the working and broken builds

The crash is inside the `page_mangler` function in citeproc's prebuilt
`citeproc_commonjs.js`. With `turbopackMinify: true` (build default), the
SWC-based minifier mangles that function such that a `String.prototype.match`
that returns `null` is no longer guarded before its `[2]` access. The same
data exercises the same code path in dev (with `turbopackMinify: false`) and
under `next build` with `turbopackMinify: false`, both of which work.

`page_mangler` is reached from `getSortKeys` → `Engine.processNumber` because
`chicago-author-date.csl` declares `<sort>` keys in its `<bibliography>`
block; APA, Vancouver, etc. don't, which is why no other style triggers it.
A CSL entry without a `page` field also doesn't trigger it.

## Trigger requirements (minimal)

All of these are required:

- `next build && next start` (i.e. Turbopack prod with default
  `experimental.turbopackMinify: true`)
- `template: 'chicago-author-date'` (any style with a page-based `<sort>`
  bibliography block)
- A CSL JSON entry with a `page` field

Removing any one of them makes the bug disappear.
