/** @module Prepare the configured Cloudflare Pages project from CI environment secrets. */

import * as Cloudflare from './Cloudflare.ts'

await Cloudflare.ensureProject({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
  project: process.env.CLOUDFLARE_PAGES_PROJECT ?? 'melee',
})
console.log('Cloudflare Pages project is ready.')
