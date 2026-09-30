import {
  ALIGN_ITEMS_VALUES,
  CUSTOM_BUTTON_COLORS,
  CUSTOM_BUTTON_COLOR_HEX,
  DIVIDER_ORIENTATIONS,
  FLEX_DIRECTIONS,
  JUSTIFY_CONTENT_VALUES,
  isGeoPageButton,
  isGeoPageContainer,
  isGeoPageDivider,
  type AlignItems,
  type CustomButtonColor,
  type DirectAccessPage,
  type DividerOrientation,
  type FlexDirection,
  type GeoNode,
  type GeoPageButton,
  type GeoPageContainer,
  type GeoPageDivider,
  type JustifyContent,
} from '../types'

interface GeoNodeEditorProps {
  node: GeoNode | GeoPageContainer
  isRoot?: boolean
  onUpdate: (updater: (n: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer) => void
  onEditPage?: () => void
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export default function GeoNodeEditor({ node, isRoot = false, onUpdate, onEditPage }: GeoNodeEditorProps) {
  if (isGeoPageDivider(node)) {
    return <DividerEditor divider={node} onUpdate={onUpdate} />
  }
  if (isGeoPageButton(node)) {
    return <ButtonEditor button={node} onUpdate={onUpdate} onEditPage={onEditPage} />
  }
  if (isGeoPageContainer(node)) {
    return <ContainerEditor container={node} isRoot={isRoot} onUpdate={onUpdate} />
  }
  return <p className="geo-node-editor-empty">Select a node</p>
}

function ContainerEditor({
  container,
  isRoot,
  onUpdate,
}: {
  container: GeoPageContainer
  isRoot: boolean
  onUpdate: (updater: (n: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer) => void
}) {
  const set = <K extends keyof GeoPageContainer>(key: K, value: GeoPageContainer[K] | undefined) => {
    onUpdate((n) => {
      if (!isGeoPageContainer(n)) return n
      const next = { ...n }
      if (value === undefined || value === '') {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  return (
    <div className="geo-node-editor">
      <h3>{isRoot ? 'Root container' : 'Container'}</h3>
      <label>
        Direction
        <select
          value={container.direction}
          onChange={(e) => set('direction', e.target.value as FlexDirection)}
        >
          {FLEX_DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label>
        Height
        <input
          type="text"
          value={container.height ?? ''}
          placeholder="e.g. 100%"
          onChange={(e) => set('height', e.target.value.trim() || undefined)}
        />
      </label>
      <label>
        Width
        <input
          type="text"
          value={container.width ?? ''}
          placeholder="e.g. 100%"
          onChange={(e) => set('width', e.target.value.trim() || undefined)}
        />
      </label>
      <label>
        Gap
        <input
          type="number"
          min={0}
          step="any"
          value={container.gap ?? ''}
          onChange={(e) => set('gap', optionalNumber(e.target.value))}
        />
      </label>
      <label>
        Padding
        <input
          type="number"
          min={0}
          step="any"
          value={container.padding ?? ''}
          onChange={(e) => set('padding', optionalNumber(e.target.value))}
        />
      </label>
      <div className="geo-node-editor-row">
        <label>
          Pad L
          <input
            type="number"
            min={0}
            step="any"
            value={container.padding_left ?? ''}
            onChange={(e) => set('padding_left', optionalNumber(e.target.value))}
          />
        </label>
        <label>
          Pad R
          <input
            type="number"
            min={0}
            step="any"
            value={container.padding_right ?? ''}
            onChange={(e) => set('padding_right', optionalNumber(e.target.value))}
          />
        </label>
      </div>
      <div className="geo-node-editor-row">
        <label>
          Pad T
          <input
            type="number"
            min={0}
            step="any"
            value={container.padding_top ?? ''}
            onChange={(e) => set('padding_top', optionalNumber(e.target.value))}
          />
        </label>
        <label>
          Pad B
          <input
            type="number"
            min={0}
            step="any"
            value={container.padding_bottom ?? ''}
            onChange={(e) => set('padding_bottom', optionalNumber(e.target.value))}
          />
        </label>
      </div>
      <label>
        Justify
        <select
          value={container.justify_content ?? ''}
          onChange={(e) =>
            set('justify_content', (e.target.value || undefined) as JustifyContent | undefined)
          }
        >
          <option value="">(default)</option>
          {JUSTIFY_CONTENT_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Align
        <select
          value={container.align_items ?? ''}
          onChange={(e) => set('align_items', (e.target.value || undefined) as AlignItems | undefined)}
        >
          <option value="">(default)</option>
          {ALIGN_ITEMS_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ButtonEditor({
  button,
  onUpdate,
  onEditPage,
}: {
  button: GeoPageButton
  onUpdate: (updater: (n: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer) => void
  onEditPage?: () => void
}) {
  const setLabelLine = (lineIndex: number, value: string) => {
    onUpdate((n) => {
      if (!isGeoPageButton(n)) return n
      const newLabel = [...n.label]
      while (newLabel.length <= lineIndex) newLabel.push('')
      newLabel[lineIndex] = value
      return { ...n, label: newLabel.slice(0, 3) }
    })
  }

  const hasPage = button.page != null
  const hasStation = button.station_id != null && button.station_id !== ''
  const isClientPage = button.page?.client_page != null

  return (
    <div className="geo-node-editor">
      <h3>Button</h3>
      <label>
        Label line 1
        <input type="text" value={button.label[0] ?? ''} onChange={(e) => setLabelLine(0, e.target.value)} />
      </label>
      <label>
        Label line 2
        <input
          type="text"
          value={button.label[1] ?? ''}
          placeholder="optional"
          onChange={(e) => setLabelLine(1, e.target.value)}
        />
      </label>
      <label>
        Label line 3
        <input
          type="text"
          value={button.label[2] ?? ''}
          placeholder="optional"
          onChange={(e) => setLabelLine(2, e.target.value)}
        />
      </label>
      <label>
        Size
        <input
          type="number"
          min={0.01}
          step="any"
          value={button.size}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!(n > 0)) return
            onUpdate((node) => (isGeoPageButton(node) ? { ...node, size: n } : node))
          }}
        />
      </label>
      <label>
        Color
        <select
          value={button.color ?? ''}
          onChange={(e) => {
            const color = e.target.value === '' ? undefined : (e.target.value as CustomButtonColor)
            onUpdate((node) => {
              if (!isGeoPageButton(node)) return node
              const next = { ...node }
              if (color == null) delete next.color
              else next.color = color
              return next
            })
          }}
        >
          <option value="">(default)</option>
          {CUSTOM_BUTTON_COLORS.map((c) => (
            <option key={c} value={c} style={{ background: CUSTOM_BUTTON_COLOR_HEX[c] }}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        Station ID
        <input
          type="text"
          value={button.station_id ?? ''}
          disabled={hasPage}
          placeholder={hasPage ? 'Clear page first' : 'e.g. LOWW_TWR'}
          onChange={(e) => {
            const station_id = e.target.value.trim()
            onUpdate((node) => {
              if (!isGeoPageButton(node)) return node
              const next = { ...node }
              if (station_id === '') delete next.station_id
              else {
                next.station_id = station_id
                delete next.page
              }
              return next
            })
          }}
        />
      </label>
      <div className="geo-node-editor-actions">
        {!hasPage && !hasStation && (
          <button
            type="button"
            onClick={() => {
              onUpdate((node) => {
                if (!isGeoPageButton(node)) return node
                const page: DirectAccessPage = { rows: 4, keys: [] }
                const next = { ...node, page }
                delete next.station_id
                return next
              })
            }}
          >
            Add page
          </button>
        )}
        {hasPage && !isClientPage && onEditPage && (
          <button type="button" onClick={onEditPage}>
            Edit page keys
          </button>
        )}
        {hasPage && isClientPage && (
          <p className="geo-node-editor-hint">Client page (read-only in this editor)</p>
        )}
        {hasPage && (
          <button
            type="button"
            onClick={() => {
              onUpdate((node) => {
                if (!isGeoPageButton(node)) return node
                const next = { ...node }
                delete next.page
                return next
              })
            }}
          >
            Remove page
          </button>
        )}
      </div>
    </div>
  )
}

function DividerEditor({
  divider,
  onUpdate,
}: {
  divider: GeoPageDivider
  onUpdate: (updater: (n: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer) => void
}) {
  return (
    <div className="geo-node-editor">
      <h3>Divider</h3>
      <label>
        Orientation
        <select
          value={divider.orientation}
          onChange={(e) => {
            const orientation = e.target.value as DividerOrientation
            onUpdate((n) => (isGeoPageDivider(n) ? { ...n, orientation } : n))
          }}
        >
          {DIVIDER_ORIENTATIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label>
        Thickness
        <input
          type="number"
          min={0.01}
          step="any"
          value={divider.thickness}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!(n > 0)) return
            onUpdate((node) => (isGeoPageDivider(node) ? { ...node, thickness: n } : node))
          }}
        />
      </label>
      <label>
        Color
        <input
          type="text"
          value={divider.color}
          onChange={(e) => {
            const color = e.target.value
            onUpdate((node) => (isGeoPageDivider(node) ? { ...node, color } : node))
          }}
        />
      </label>
      <label>
        Oversize
        <input
          type="number"
          min={0.01}
          step="any"
          value={divider.oversize ?? ''}
          placeholder="optional"
          onChange={(e) => {
            const raw = e.target.value.trim()
            onUpdate((node) => {
              if (!isGeoPageDivider(node)) return node
              const next = { ...node }
              if (raw === '') delete next.oversize
              else {
                const n = Number(raw)
                if (n > 0) next.oversize = n
              }
              return next
            })
          }}
        />
      </label>
    </div>
  )
}
