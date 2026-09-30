/**
 * Shared GitHub access for vacs-project/vacs-data.
 * One recursive tree fetch is reused by stations and profiles (rate-limit friendly).
 */

export const TREE_API =
  'https://api.github.com/repos/vacs-project/vacs-data/git/trees/main?recursive=1'
export const RAW_BASE =
  'https://raw.githubusercontent.com/vacs-project/vacs-data/main/dataset'

/** Optional token for higher GitHub API rate limits (5k/hr vs 60/hr). Set VITE_GITHUB_TOKEN in .env.local */
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined

const TREE_CACHE_TTL_MS = 5 * 60 * 1000

export interface RepoTreeEntry {
  path: string
  type: string
}

let treeInflight: Promise<RepoTreeEntry[]> | null = null
let treeCached: RepoTreeEntry[] | null = null
let treeCachedAt = 0

export function apiHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: 'application/vnd.github.v3+json' }
  if (GITHUB_TOKEN) (h as Record<string, string>)['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  return h
}

/**
 * Fetch the vacs-data recursive git tree. Concurrent callers share one request;
 * successful results are cached briefly.
 */
export async function fetchRepoTree(): Promise<RepoTreeEntry[]> {
  if (treeCached != null && Date.now() - treeCachedAt < TREE_CACHE_TTL_MS) {
    return treeCached
  }
  if (treeInflight != null) return treeInflight

  const p = (async (): Promise<RepoTreeEntry[]> => {
    let res = await fetch(TREE_API, { headers: apiHeaders() })
    // If a configured token is invalid/expired, GitHub returns 401.
    // Retry once without Authorization so the app can still use anonymous limits.
    if (res.status === 401 && GITHUB_TOKEN) {
      res = await fetch(TREE_API, { headers: { Accept: 'application/vnd.github.v3+json' } })
    }
    if (!res.ok) throw new Error(`Failed to fetch repo tree: ${res.status} ${res.statusText}`)
    const data = await res.json()
    const tree: RepoTreeEntry[] = data.tree ?? []
    treeCached = tree
    treeCachedAt = Date.now()
    return tree
  })()

  treeInflight = p
  p.finally(() => {
    treeInflight = null
  })
  return p
}

export function rawDatasetUrl(...segments: string[]): string {
  return `${RAW_BASE}/${segments.map(encodeURIComponent).join('/')}`
}
