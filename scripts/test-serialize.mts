#!/usr/bin/env node
/**
 * Fetches profile JSON files from vacs-data, normalizes, serializes, and verifies round-trip.
 * Usage: npx tsx scripts/test-serialize.mts
 */

const BASE =
  "https://raw.githubusercontent.com/MorpheusXAUT/vacs-data/main/dataset"

const PROFILES = [
  "EDGG/profiles/EDGG_EBG1.json",
  "ES/profiles/ESMM_ALL.json",
  "EDGG/profiles/EDGG_DFAN.json",
]

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== "object") return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  const keysA = Object.keys(a as object).sort()
  const keysB = Object.keys(b as object).sort()
  if (keysA.length !== keysB.length) return false
  if (keysA.some((k, i) => k !== keysB[i])) return false
  return keysA.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  )
}

async function main() {
  const { normalizeProfile, validateProfile } = await import("../src/lib/validation.ts")
  const { serializeProfile } = await import("../src/lib/serializeProfile.ts")

  let passed = 0
  let failed = 0

  for (const path of PROFILES) {
    const url = `${BASE}/${path}`
    const name = path.split("/").pop() ?? path
    process.stdout.write(`Testing ${name}... `)

    try {
      const raw = await fetchJson<unknown>(url)
      const validated = validateProfile(raw)
      if (!validated.ok) {
        console.error(`FAIL: invalid profile: ${JSON.stringify(validated.errors)}`)
        failed++
        continue
      }
      const normalized = normalizeProfile(validated.profile)
      const serialized = serializeProfile(normalized)

      let parsed: unknown
      try {
        parsed = JSON.parse(serialized)
      } catch (e) {
        console.error(`FAIL: serialized output is not valid JSON: ${(e as Error).message}`)
        failed++
        continue
      }

      const reparsedValidated = validateProfile(parsed)
      if (!reparsedValidated.ok) {
        console.error(`FAIL: reparsed profile invalid: ${JSON.stringify(reparsedValidated.errors)}`)
        failed++
        continue
      }
      const reparsedNormalized = normalizeProfile(reparsedValidated.profile)

      if (!deepEqual(normalized, reparsedNormalized)) {
        console.error("FAIL: round-trip data mismatch")
        failed++
        continue
      }

      console.log("OK")
      passed++
    } catch (e) {
      console.error(`FAIL: ${(e as Error).message}`)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
