# Turbopack prod minifier breaks citeproc `page_mangler`

Minimal reproduction for a Next.js 16 / Turbopack prod-minifier bug that
causes [`citeproc-js`](https://www.npmjs.com/package/citeproc) loading
a Chicago author-date bibliography having `page` field to throws:

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

## Steps to reproduce

1. `next dev` works.
2. `next build && next start` throws.
3. Setting
   `experimental.turbopackMinify: false` in `next.config.ts` makes 2. works

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
