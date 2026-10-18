/** @module Ensure the requested Pages project exists without masking API errors. */

/** Reuse a Pages project, creating it only after a confirmed 404. */
export async function ensureProject(options: ensureProject.Options): Promise<void> {
  if (!/^[a-f0-9]{32}$/i.test(options.accountId)) throw new Error('CLOUDFLARE_ACCOUNT_ID must be a 32-character account ID')
  if (!/^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/.test(options.project)) throw new Error('Invalid Cloudflare Pages project name')
  if (!options.apiToken) throw new Error('CLOUDFLARE_API_TOKEN is required')

  const request = options.fetch ?? globalThis.fetch
  const base = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/pages/projects`
  const headers = { authorization: `Bearer ${options.apiToken}`, 'content-type': 'application/json' }
  const current = await request(`${base}/${options.project}`, { headers })
  if (current.ok) return
  if (current.status !== 404) throw new Error(`Cloudflare project lookup failed (HTTP ${current.status}). Check the account ID and Pages:Edit token permission.`)

  const created = await request(base, { method: 'POST', headers, body: JSON.stringify({ name: options.project, production_branch: 'main' }) })
  if (!created.ok) throw new Error(`Cloudflare project creation failed (HTTP ${created.status})`)
  const result = await created.json() as { success?: boolean }
  if (result.success !== true) throw new Error('Cloudflare did not confirm project creation')
}

export declare namespace ensureProject {
  /** Account-scoped deployment inputs. Tokens are never logged or written to disk. */
  type Options = {
    /** Account receiving the deployment. */
    readonly accountId: string
    /** Token with Cloudflare Pages Edit for this account. */
    readonly apiToken: string
    /** Optional HTTP transport, primarily for deterministic integration tests. */
    readonly fetch?: typeof globalThis.fetch | undefined
    /** Direct-upload Pages project name. */
    readonly project: string
  }
}
