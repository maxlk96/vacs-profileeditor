import {
  isGeoPageButton,
  isGeoPageContainer,
  isGeoPageDivider,
  type GeoNode,
  type GeoPageButton,
  type GeoPageContainer,
  type GeoProfile,
} from '../types'

/** Path into a geo tree: indices into successive `children` arrays. Empty = root container. */
export type GeoPath = number[]

export function getNodeAtPath(root: GeoPageContainer, path: GeoPath): GeoNode | GeoPageContainer | null {
  if (path.length === 0) return root
  let container: GeoPageContainer = root
  for (let i = 0; i < path.length; i++) {
    const index = path[i]!
    const child = container.children[index] as GeoNode | undefined
    if (child == null) return null
    if (i === path.length - 1) return child
    if (!isGeoPageContainer(child)) return null
    container = child
  }
  return container
}

export function getParentContainer(
  root: GeoPageContainer,
  path: GeoPath
): { container: GeoPageContainer; childIndex: number } | null {
  if (path.length === 0) return null
  const parentPath = path.slice(0, -1)
  const parent = getNodeAtPath(root, parentPath)
  if (parent == null || !isGeoPageContainer(parent)) return null
  const childIndex = path[path.length - 1]!
  if (childIndex < 0 || childIndex >= parent.children.length) return null
  return { container: parent, childIndex }
}

export function updateNodeAtPath(
  root: GeoPageContainer,
  path: GeoPath,
  updater: (node: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer
): GeoPageContainer {
  if (path.length === 0) {
    return updater(root) as GeoPageContainer
  }
  const updateChildren = (container: GeoPageContainer, pathIdx: number): GeoPageContainer => {
    const index = path[pathIdx]!
    const children = [...container.children]
    if (pathIdx === path.length - 1) {
      const current = children[index]
      if (current == null) return container
      children[index] = updater(current) as GeoNode
      return { ...container, children }
    }
    const child = children[index]
    if (child == null || !isGeoPageContainer(child)) return container
    children[index] = updateChildren(child, pathIdx + 1)
    return { ...container, children }
  }
  return updateChildren(root, 0)
}

export function updateProfileAtPath(
  profile: GeoProfile,
  path: GeoPath,
  updater: (node: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer
): GeoProfile {
  const next = updateNodeAtPath(profile, path, updater)
  return { ...next, id: profile.id, type: 'Geo' }
}

export function insertChildAtPath(
  profile: GeoProfile,
  parentPath: GeoPath,
  index: number,
  node: GeoNode
): GeoProfile {
  return updateProfileAtPath(profile, parentPath, (n) => {
    if (!isGeoPageContainer(n)) return n
    const children = [...n.children]
    const at = Math.max(0, Math.min(index, children.length))
    children.splice(at, 0, node)
    return { ...n, children }
  })
}

export function removeNodeAtPath(profile: GeoProfile, path: GeoPath): GeoProfile | null {
  if (path.length === 0) return null
  const parentPath = path.slice(0, -1)
  const childIndex = path[path.length - 1]!
  const parent = getNodeAtPath(profile, parentPath)
  if (parent == null || !isGeoPageContainer(parent)) return null
  if (parent.children.length <= 1) return null
  return updateProfileAtPath(profile, parentPath, (n) => {
    if (!isGeoPageContainer(n)) return n
    return { ...n, children: n.children.filter((_, i) => i !== childIndex) }
  })
}

export function moveNodeAtPath(
  profile: GeoProfile,
  path: GeoPath,
  direction: 'up' | 'down'
): GeoProfile | null {
  if (path.length === 0) return null
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]!
  const parent = getNodeAtPath(profile, parentPath)
  if (parent == null || !isGeoPageContainer(parent)) return null
  const to = direction === 'up' ? index - 1 : index + 1
  if (to < 0 || to >= parent.children.length) return null
  return updateProfileAtPath(profile, parentPath, (n) => {
    if (!isGeoPageContainer(n)) return n
    const children = [...n.children]
    const [removed] = children.splice(index, 1)
    children.splice(to, 0, removed!)
    return { ...n, children }
  })
}

function pathsEqual(a: GeoPath, b: GeoPath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/** True when `ancestor` is equal to `path` or a strict prefix of it. */
export function isAncestorPath(ancestor: GeoPath, path: GeoPath): boolean {
  if (ancestor.length > path.length) return false
  return ancestor.every((v, i) => v === path[i])
}

export function pathToId(path: GeoPath): string {
  return path.length === 0 ? 'root' : path.join('.')
}

export function idToPath(id: string): GeoPath | null {
  if (id === 'root') return []
  if (!/^\d+(\.\d+)*$/.test(id)) return null
  return id.split('.').map((s) => Number(s))
}

function getMutableContainer(root: GeoPageContainer, path: GeoPath): GeoPageContainer | null {
  if (path.length === 0) return root
  let container: GeoPageContainer = root
  for (const index of path) {
    const child = container.children[index]
    if (child == null || !isGeoPageContainer(child)) return null
    container = child
  }
  return container
}

/**
 * Move a node to another place in the tree.
 * - `toParentPath` is the destination container (empty = root)
 * - `toIndex` is the insertion index among that container's children
 * Returns null if the move is invalid (root, into self/descendant, empty parent).
 */
export function relocateNode(
  profile: GeoProfile,
  fromPath: GeoPath,
  toParentPath: GeoPath,
  toIndex: number
): { profile: GeoProfile; newPath: GeoPath } | null {
  if (fromPath.length === 0) return null
  if (isAncestorPath(fromPath, toParentPath)) return null

  const fromParentPath = fromPath.slice(0, -1)
  const fromIndex = fromPath[fromPath.length - 1]!
  const fromParent = getNodeAtPath(profile, fromParentPath)
  const toParent = getNodeAtPath(profile, toParentPath)
  if (fromParent == null || !isGeoPageContainer(fromParent)) return null
  if (toParent == null || !isGeoPageContainer(toParent)) return null
  if (fromIndex < 0 || fromIndex >= fromParent.children.length) return null

  const sameParent = pathsEqual(fromParentPath, toParentPath)
  if (!sameParent && fromParent.children.length <= 1) return null

  let insertAt = Math.max(0, Math.min(toIndex, toParent.children.length))
  if (sameParent) {
    if (fromIndex < insertAt) insertAt -= 1
    if (insertAt === fromIndex) return null
  }

  const next = JSON.parse(JSON.stringify(profile)) as GeoProfile
  const mutableFromParent = getMutableContainer(next, fromParentPath)
  const mutableToParent = getMutableContainer(next, toParentPath)
  if (mutableFromParent == null || mutableToParent == null) return null

  const [removed] = mutableFromParent.children.splice(fromIndex, 1)
  if (removed == null) return null
  mutableToParent.children.splice(insertAt, 0, removed)

  return {
    profile: next,
    newPath: [...toParentPath, insertAt],
  }
}

export function nodeLabel(node: GeoNode | GeoPageContainer): string {
  if (isGeoPageDivider(node)) {
    return `Divider (${node.orientation})`
  }
  if (isGeoPageButton(node)) {
    const line = (node.label[0] ?? '').trim()
    return line || 'Button'
  }
  if (isGeoPageContainer(node)) {
    return `Container (${node.direction})`
  }
  return 'Node'
}

export function buttonSummary(button: GeoPageButton): string {
  const parts = [nodeLabel(button)]
  if (button.station_id) parts.push(`→ ${button.station_id}`)
  else if (button.page?.client_page != null) parts.push('(client page)')
  else if (button.page != null) parts.push(`(${button.page.keys?.length ?? 0} keys)`)
  return parts.join(' ')
}
