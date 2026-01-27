---
description: Workflow for setting up and building the Electron Windows executable for this Next.js project.
---

# Electron + Next.js Build Workflow

This workflow documents the configuration steps and build commands used to successfully generate a portable Windows .exe.

## 1. Configuration (Already Completed)

The following files were configured for Electron + Next.js Static Export:

### `package.json`
- **Main Entry**: `"main": "electron/main.cjs"`
- **Scripts**: 
  - `"electron:dev"`: Runs app in dev mode (localhost:4000)
  - `"electron:build"`: Builds static app & packages with electron-builder
- **Build Config**: Targeted `win` (portable) and included `out/**/*`.

### `next.config.ts`
Warning: These settings are critical for Electron file:// protocol support.
- `output: 'export'`: Static HTML export
- `assetPrefix: './'`: Relative paths for assets
- `trailingSlash: true`: Ensures directory-based routing (fix for white screen)
- `images.unoptimized: true`: Disable Next.js image optimization

### `electron/main.cjs`
- **Prod**: Loads `../out/index.html`
- **Dev**: Loads `http://localhost:4000`
- **Window**: Fullscreen, Node integration enabled.

## 2. Usage Steps

### Development
To run the app in Electron window with hot-reloading:
// turbo
```powershell
npm run electron:dev
```

### Production Build
To generate the Windows executable:

1. **Clean** (Optional but recommended):
```powershell
Remove-Item -Path release -Recurse -Force
Remove-Item -Path out -Recurse -Force
```

2. **Build & Package**:
// turbo
```powershell
npm run electron:build
```

3. **Output**:
Executable found in: `release/Parliament Wayfinding Kiosk X.X.X.exe`

## 3. Important Notes
- **Assets**: Always use relative paths (e.g., `./model.glb`, not `/model.glb`) for 3D models and images.
- **Port**: Dev server runs on port 4000 to avoid conflicts.
