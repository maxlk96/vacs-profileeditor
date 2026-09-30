# VACS Profile Editor

### Deployed on [https://maxlk96.github.io/vacs-profileeditor/](https://maxlk96.github.io/vacs-profileeditor/)

A simple GUI to create and edit **VACS profiles** (Tabbed and Geo) without manually editing JSON.  
Profiles define the layout of direct-access keys for the [VATSIM ATC Communication System (vacs)](https://github.com/MorpheusXAUT/vacs) client.

- **JSON import/export**: Load a profile from a `.json` file or straight from the [vacs-data](https://github.com/vacs-project/vacs-data) dataset (filter by FIR folder), edit in the UI, save as JSON (download).
- **Profile types**: **Tabbed** (tabs + key grid) or **Geo** (flexible containers, buttons, and dividers). Switch type from the header (replaces layout; keeps profile ID).
- **View mode** (Tabbed only): Set how the client arranges radio and phone pages (`page`, `split`, or `cycle`). Omitted in JSON when left at the default (`page`). Geo profiles always use page view.
- **Tabs** (Tabbed): Add, duplicate, remove, reorder tabs (including **drag-and-drop**). Edit tab label and row count.
- **Geo layout**: Edit the container tree, preview the flex layout, and configure buttons (label, size, color, station ID or nested page) and dividers. Double-click a button with a page to edit its keys like a tabbed page.
- **Keys**: Add, remove, reorder keys (including **drag-and-drop** in the grid). **Multi-select** with Ctrl+click (or Shift+click for range) to move several at once. **Copy/cut/paste** keys (Ctrl+C/X/V). Move key left/right/up/down. Edit label (up to 3 lines), button color, station ID, and optional subpage.
- **Client-page tabs/buttons**: Pages that use `client_page` (dynamic client list) are shown as read-only.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy selected key(s) |
| `Ctrl+X` | Cut selected key(s) |
| `Ctrl+V` | Paste key(s) |
| `Enter` | Open subpage (when a key with subpage is selected) |
| `↑` `↓` | Move selected key(s) up/down |
| `←` `→` | Move selected key(s) left/right |
| `C` | Clear selected key |
| `Delete` | Remove selected key(s) |

*Shortcuts are disabled when typing in an input field. Use Ctrl+click to add to selection, Shift+click for range select.*

# Contributing

Forks and PRs are encouraged!
Feel free to create issues, don't count on frequent updates of this project, it already serves its main purpose.

# Running a local deployment

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Use **Load JSON** for a local file, or **Load from dataset** to pick an FIR and profile from [vacs-data](https://github.com/vacs-project/vacs-data/tree/main/dataset). Edit, then **Save as** to download.

## Build

```bash
npm run build
```

Output is in `dist/`.

## Profile format

**Tabbed** and **Geo** profiles are supported. See [Profile Configuration (vacs-data)](https://github.com/vacs-project/vacs-data/blob/main/docs/dataset/profiles.md).
