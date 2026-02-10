import { defineConfig } from 'drizzle-kit'
import { resolve } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'

// Load centralized .env from project root
const envPath = resolve(__dirname, '../.env')
if (existsSync(envPath)) {
  const text = readFileSync(envPath, 'utf-8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})