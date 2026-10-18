/** @module Check deployment setup behavior without making external account changes. */

import * as Assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import * as Cloudflare from '../scripts/Cloudflare.ts'

describe('ensureProject', () => {
  test('reuses an existing project without a create request', async () => {
    const calls: string[] = []
    await Cloudflare.ensureProject({ accountId: 'a'.repeat(32), apiToken: 'test-token', project: 'melee', fetch: async (input, init) => {
      calls.push(`${init?.method ?? 'GET'} ${input}`)
      return new Response('{}')
    } })
    Assert.equal(calls.length, 1)
    Assert.match(calls[0]!, /\/pages\/projects\/melee$/)
  })

  test('creates the named main-branch project only after a 404', async () => {
    const calls: RequestInit[] = []
    await Cloudflare.ensureProject({ accountId: 'a'.repeat(32), apiToken: 'test-token', project: 'melee', fetch: async (_input, init) => {
      calls.push(init ?? {})
      return calls.length === 1 ? new Response('{}', { status: 404 }) : new Response('{"success":true}')
    } })
    Assert.equal(calls.length, 2)
    Assert.equal(calls[1]?.method, 'POST')
    Assert.deepEqual(JSON.parse(String(calls[1]?.body)), { name: 'melee', production_branch: 'main' })
  })

  test('does not create a project on authentication, permission, or server errors', async () => {
    for (const status of [401, 403, 500]) {
      let calls = 0
      await Assert.rejects(Cloudflare.ensureProject({ accountId: 'a'.repeat(32), apiToken: 'test-token', project: 'melee', fetch: async () => { calls++; return new Response('{}', { status }) } }), new RegExp(`HTTP ${status}`))
      Assert.equal(calls, 1)
    }
  })
})
