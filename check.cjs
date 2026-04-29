const puppeteer = require('puppeteer')

;(async () => {
  const url = process.argv[2] || 'http://localhost:3100/'
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  const consoleEntries = []
  const pageErrors = []
  page.on('console', msg => consoleEntries.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => pageErrors.push(String(err) + '\n' + (err.stack || '')))
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise(r => setTimeout(r, 1500))
  const errText = await page.$eval('pre[style*="red"]', el => el.textContent).catch(() => '(missing)')
  const outText = await page.$eval('pre:not([style*="red"])', el => el.textContent).catch(() => '(missing)')
  await browser.close()
  console.log('--- URL ---')
  console.log(url)
  console.log('--- DOM error pre ---')
  console.log(errText)
  console.log('--- DOM output pre ---')
  console.log(outText)
  console.log('--- Console ---')
  console.log(consoleEntries.join('\n') || '(empty)')
  console.log('--- Page errors ---')
  console.log(pageErrors.join('\n---\n') || '(empty)')
})().catch(e => { console.error(e); process.exit(1) })
