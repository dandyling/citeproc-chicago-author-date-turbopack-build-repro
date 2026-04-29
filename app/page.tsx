'use client'

import { useEffect, useState } from 'react'
import { Cite, plugins } from '@citation-js/core'
import '@citation-js/plugin-csl'

const SAMPLE = [
  {
    id: '1',
    type: 'article-journal',
    title: 'Hello World',
    author: [{ family: 'Doe', given: 'Jane' }],
    issued: { 'date-parts': [[2024]] },
    page: '45-67',
  },
]

export default function Home() {
  const [out, setOut] = useState<string>('(loading)')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      // chicago-author-date is not bundled in @citation-js/plugin-csl by
      // default. Fetch the official CSL XML and register it the way real apps do.
      const xml = await fetch('/chicago-author-date.csl').then(r => r.text())
      ;(plugins.config.get('@csl') as any).templates.add('chicago-author-date', xml)

      try {
        const cite = new Cite(SAMPLE)
        const bib = cite.format('bibliography', {
          format: 'html',
          template: 'chicago-author-date',
          lang: 'en-US',
          asEntryArray: true,
        }) as unknown
        setOut(JSON.stringify(bib, null, 2))
      } catch (e) {
        setErr(String(e) + '\n\n' + (e instanceof Error ? e.stack : ''))
      }
    })()
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>Turbopack prod minifier breaks citeproc page_mangler</h1>
      <p>
        Expected: bibliography entry rendered.<br />
        Actual (in <code>next build &amp;&amp; next start</code>):{' '}
        <code>TypeError: Cannot read properties of null (reading &apos;2&apos;)</code>
      </p>
      <h2>Error:</h2>
      <pre style={{ color: 'red' }}>{err ?? '(none)'}</pre>
      <h2>Output:</h2>
      <pre>{out}</pre>
    </main>
  )
}
