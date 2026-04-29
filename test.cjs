// Smoke test: verifies the repro still reproduces the bug.
//   - dev mode → bibliography renders, no error
//   - prod build (default turbopackMinify) → TypeError reading '2' from page_mangler

const { spawn } = require('child_process')
const puppeteer = require('puppeteer')

const PORT = 3210
const URL = `http://localhost:${PORT}/`
const EXPECTED_ERR = /Cannot read properties of null \(reading '2'\)/
const EXPECTED_STACK = /page_mangler/

function startServer(cmd, args) {
  const proc = spawn(cmd, args, {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return new Promise((resolve, reject) => {
    let stderr = ''
    const onLine = (buf) => {
      const s = buf.toString()
      stderr += s
      if (/Ready in|started server on/i.test(s)) resolve(proc)
    }
    proc.stdout.on('data', onLine)
    proc.stderr.on('data', onLine)
    proc.on('exit', (code) => {
      if (code !== 0) reject(new Error(`server exited early: ${stderr}`))
    })
    setTimeout(() => reject(new Error(`server did not become ready:\n${stderr}`)), 60000)
  })
}

async function probe() {
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))
  const errText = await page.$eval('pre[style*="red"]', (el) => el.textContent).catch(() => '')
  const outText = await page.$eval('pre:not([style*="red"])', (el) => el.textContent).catch(() => '')
  await browser.close()
  return { errText, outText }
}

async function kill(proc) {
  if (!proc || proc.exitCode !== null) return
  proc.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 500))
  if (proc.exitCode === null) proc.kill('SIGKILL')
}

async function run() {
  let dev, prod
  let failed = false
  try {
    console.log('--- dev mode ---')
    dev = await startServer('npx', ['next', 'dev', '-p', String(PORT)])
    const { errText, outText } = await probe()
    if (errText && errText.trim() !== '(none)') {
      console.error(`FAIL dev: unexpected error in DOM:\n${errText}`)
      failed = true
    } else if (!/Doe, Jane\. 2024/.test(outText)) {
      console.error(`FAIL dev: bibliography did not render:\n${outText}`)
      failed = true
    } else {
      console.log('OK dev: bibliography rendered without error')
    }
    await kill(dev)

    console.log('--- prod (default turbopackMinify) ---')
    prod = await startServer('npx', ['next', 'start', '-p', String(PORT)])
    const r = await probe()
    if (!EXPECTED_ERR.test(r.errText) || !EXPECTED_STACK.test(r.errText)) {
      console.error(
        `FAIL prod: expected TypeError with page_mangler stack frame.\n` +
          `Error block:\n${r.errText}\nOutput block:\n${r.outText}`,
      )
      failed = true
    } else {
      console.log('OK prod: bug still reproduces (TypeError at page_mangler)')
    }
  } catch (e) {
    console.error('test runner error:', e)
    failed = true
  } finally {
    await kill(dev)
    await kill(prod)
  }
  process.exit(failed ? 1 : 0)
}

run()
