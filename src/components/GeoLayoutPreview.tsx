import type { CSSProperties } from 'react'
import {
  CUSTOM_BUTTON_COLOR_HEX,
  isGeoPageButton,
  isGeoPageContainer,
  isGeoPageDivider,
  type GeoNode,
  type GeoPageContainer,
  type GeoProfile,
} from '../types'
import { type GeoPath } from '../lib/geo'

interface GeoLayoutPreviewProps {
  profile: GeoProfile
  selectedPath: GeoPath
  onSelectPath: (path: GeoPath) => void
  onEditButtonPage: (path: GeoPath) => void
}

function pathsEqual(a: GeoPath, b: GeoPath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function justifyCss(value: string | undefined): string | undefined {
  if (value == null) return undefined
  if (value === 'start' || value === 'end') return `flex-${value}`
  return value
}

function alignCss(value: string | undefined): string | undefined {
  if (value == null) return undefined
  if (value === 'start' || value === 'end') return `flex-${value}`
  return value
}

export default function GeoLayoutPreview({
  profile,
  selectedPath,
  onSelectPath,
  onEditButtonPage,
}: GeoLayoutPreviewProps) {
  return (
    <div className="geo-preview">
      <div className="geo-preview-canvas">
        <PreviewContainer
          container={profile}
          path={[]}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onEditButtonPage={onEditButtonPage}
          isRoot
        />
      </div>
    </div>
  )
}

interface PreviewContainerProps {
  container: GeoPageContainer
  path: GeoPath
  selectedPath: GeoPath
  onSelectPath: (path: GeoPath) => void
  onEditButtonPage: (path: GeoPath) => void
  isRoot?: boolean
}

function PreviewContainer({
  container,
  path,
  selectedPath,
  onSelectPath,
  onEditButtonPage,
  isRoot = false,
}: PreviewContainerProps) {
  const selected = pathsEqual(path, selectedPath)
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: container.direction === 'col' ? 'column' : 'row',
    gap: container.gap != null ? `${container.gap * 4}px` : undefined,
    padding: container.padding != null ? `${container.padding * 4}px` : undefined,
    paddingLeft: container.padding_left != null ? `${container.padding_left * 4}px` : undefined,
    paddingRight: container.padding_right != null ? `${container.padding_right * 4}px` : undefined,
    paddingTop: container.padding_top != null ? `${container.padding_top * 4}px` : undefined,
    paddingBottom: container.padding_bottom != null ? `${container.padding_bottom * 4}px` : undefined,
    justifyContent: justifyCss(container.justify_content),
    alignItems: alignCss(container.align_items),
    height: container.height,
    width: container.width ?? (isRoot ? '100%' : undefined),
    flex: isRoot ? 1 : undefined,
    minHeight: isRoot ? '100%' : undefined,
  }

  return (
    <div
      className={`geo-preview-container ${selected ? 'selected' : ''} ${isRoot ? 'root' : ''}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelectPath(path)
      }}
    >
      {container.children.map((child, i) => (
        <PreviewNode
          key={i}
          node={child}
          path={[...path, i]}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onEditButtonPage={onEditButtonPage}
        />
      ))}
    </div>
  )
}

interface PreviewNodeProps {
  node: GeoNode
  path: GeoPath
  selectedPath: GeoPath
  onSelectPath: (path: GeoPath) => void
  onEditButtonPage: (path: GeoPath) => void
}

function PreviewNode({
  node,
  path,
  selectedPath,
  onSelectPath,
  onEditButtonPage,
}: PreviewNodeProps) {
  if (isGeoPageContainer(node)) {
    return (
      <PreviewContainer
        container={node}
        path={path}
        selectedPath={selectedPath}
        onSelectPath={onSelectPath}
        onEditButtonPage={onEditButtonPage}
      />
    )
  }

  if (isGeoPageDivider(node)) {
    const selected = pathsEqual(path, selectedPath)
    const isVertical = node.orientation === 'vertical'
    return (
      <div
        className={`geo-preview-divider ${selected ? 'selected' : ''}`}
        style={{
          background: node.color,
          width: isVertical ? `${node.thickness}px` : '100%',
          height: isVertical ? '100%' : `${node.thickness}px`,
          alignSelf: 'stretch',
          flexShrink: 0,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelectPath(path)
        }}
        title={`Divider (${node.orientation})`}
      />
    )
  }

  if (isGeoPageButton(node)) {
    const selected = pathsEqual(path, selectedPath)
    const bg = node.color != null ? CUSTOM_BUTTON_COLOR_HEX[node.color] : undefined
    const lines = node.label.length > 0 ? node.label : ['']
    return (
      <button
        type="button"
        className={`geo-preview-button ${selected ? 'selected' : ''}`}
        style={{
          flex: `${node.size} 1 0`,
          background: bg,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelectPath(path)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (node.page != null && node.page.client_page == null) {
            onEditButtonPage(path)
          }
        }}
        title={node.station_id ?? (node.page != null ? 'Has page (double-click to edit)' : 'Button')}
      >
        {lines.map((line, i) => (
          <span key={i}>{line || '\u00a0'}</span>
        ))}
      </button>
    )
  }

  return null
}
