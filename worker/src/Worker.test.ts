/** @module Integration tests for the image Worker running in workerd. */
import * as Path from 'node:path'
import * as Zlib from 'node:zlib'
import { unstable_startWorker } from 'wrangler'

const encode = (source: string | Buffer) => Zlib.deflateSync(source).toString('base64url')

describe('fetch', () => {
  let worker: Awaited<ReturnType<typeof unstable_startWorker>>

  beforeAll(async () => {
    worker = await unstable_startWorker({
      config: Path.join(import.meta.dirname, '../wrangler.jsonc'),
      dev: { inspector: false, server: { port: 0 } },
    })
    await worker.ready
  }, 60_000)

  afterAll(async () => {
    await worker?.dispose()
  })

  test('renders through the precompiled module with an adaptive scheme', async () => {
    const response = await worker.fetch(`http://ondine.test/${encode('not a diagram')}.svg`)

    expect(response.status).toMatchInlineSnapshot(`400`)
    expect(response.headers.get('cache-control')).toMatchInlineSnapshot(`"public, max-age=300"`)
    expect(response.headers.get('content-security-policy')).toMatchInlineSnapshot(
      `"default-src 'none'; style-src 'unsafe-inline'"`,
    )
    expect(response.headers.get('content-type')).toMatchInlineSnapshot(
      `"image/svg+xml; charset=utf-8"`,
    )
    expect(response.headers.get('x-content-type-options')).toMatchInlineSnapshot(`"nosniff"`)
    expect(await response.text()).toMatchInlineSnapshot(
      `"<svg xmlns="http://www.w3.org/2000/svg" width="394" height="64" viewBox="0 0 394 64"><style>:root{--ondine-bg:#fff;--ondine-fg:#000;--ondine-line:#000}@media (prefers-color-scheme:dark){:root{--ondine-bg:#000;--ondine-fg:#fff;--ondine-line:#fff}}</style><rect width="100%" height="100%" fill="var(--ondine-bg)" stroke="var(--ondine-line)" stroke-width="2"/><text font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="14" fill="var(--ondine-fg)" xml:space="preserve"><tspan x="12" y="26">Ondine could not render this diagram.</tspan><tspan x="12" y="46">No diagram type detected for the given text.</tspan></text></svg>"`,
    )
  })

  test('pins a scheme', async () => {
    const response = await worker.fetch(
      `http://ondine.test/${encode('not a diagram')}.svg?scheme=dark`,
    )

    expect((await response.text()).match(/<style>.*?<\/style>/)?.[0]).toMatchInlineSnapshot(
      `"<style>:root{--ondine-bg:#000;--ondine-fg:#fff;--ondine-line:#fff}</style>"`,
    )
  })

  test('rejects malformed payloads', async () => {
    const notBase64 = await worker.fetch('http://ondine.test/a.svg')
    expect(notBase64.status).toMatchInlineSnapshot(`400`)
    expect((await notBase64.text()).match(/Payload[^<]*/)?.[0]).toMatchInlineSnapshot(
      `"Payload is not base64url."`,
    )

    const notDeflate = await worker.fetch(
      `http://ondine.test/${Buffer.from('flowchart').toString('base64url')}.svg`,
    )
    expect(notDeflate.status).toMatchInlineSnapshot(`400`)
    expect((await notDeflate.text()).match(/Payload[^<]*/)?.[0]).toMatchInlineSnapshot(
      `"Payload is not zlib-deflated UTF-8."`,
    )
  })

  test('caps inflated source', async () => {
    const response = await worker.fetch(
      `http://ondine.test/${encode(Buffer.alloc(65 * 1024, 'a'))}.svg`,
    )

    expect(response.status).toMatchInlineSnapshot(`400`)
    expect((await response.text()).match(/Source[^<]*/)?.[0]).toMatchInlineSnapshot(
      `"Source exceeds 65536 bytes."`,
    )
  })

  test('caps the path length', async () => {
    const response = await worker.fetch(`http://ondine.test/${'a'.repeat(4096)}.svg`)

    expect((await response.text()).match(/Payload[^<]*/)?.[0]).toMatchInlineSnapshot(
      `"Payload exceeds 4096 characters."`,
    )
  })

  test('rejects other routes and methods', async () => {
    const route = await worker.fetch('http://ondine.test/')
    expect(route.status).toMatchInlineSnapshot(`404`)

    const method = await worker.fetch(`http://ondine.test/${encode('flowchart')}.svg`, {
      method: 'POST',
    })
    expect(method.status).toMatchInlineSnapshot(`405`)
  })
})
