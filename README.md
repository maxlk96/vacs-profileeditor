# VACS Profile Editor

A simple GUI to create and edit **VACS tabbed profiles** without manually editing JSON.  
Profiles define the layout of direct-access keys for the [VATSIM ATC Communication System (vacs)](https://github.com/MorpheusXAUT/vacs) client.

- **JSON import/export**: Load a profile from a `.json` file, edit in the UI, save as JSON (download).
- **Tabs**: Add, remove, reorder tabs (including **drag-and-drop**). Edit tab label and row count.
- **Keys**: Add, remove, reorder keys (including **drag-and-drop** in the grid). Move key left/right/up/down. Edit label (up to 3 lines), station ID, and optional subpage.
- **Client-page tabs**: Tabs that use `client_page` (dynamic client list) are shown as read-only.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Use **Load JSON** to open a profile (e.g. from [vacs-data](https://github.com/MorpheusXAUT/vacs-data/tree/main/dataset/LO/profiles)), edit, and **Save JSON** to download.

## Build

```bash
npm run build
```

Output is in `dist/`.

## Profile format

Only **Tabbed** profiles are supported. See [Profile Configuration (vacs-data)](https://github.com/MorpheusXAUT/vacs-data/blob/main/docs/dataset/profiles.md).
