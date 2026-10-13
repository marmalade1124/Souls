# Graph Report - Soul  (2026-10-14)

## Corpus Check
- Corpus is ~14,013 words - fits in a single context window. You may not need a graph.

## Summary
- 264 nodes · 429 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Desktop Island Interface
- App Features and Design
- Windows App Coordination
- Desktop App Components
- Desktop App Components
- Rich Clipboard History
- Desktop App Components
- Desktop App Components
- Native Windows Controls

## God Nodes (most connected - your core abstractions)
1. `Soul Windows desktop island` - 26 edges
2. `init()` - 18 edges
3. `renderClips()` - 10 edges
4. `act()` - 9 edges
5. `initSliders()` - 9 edges
6. `toast()` - 8 edges
7. `setExpanded()` - 8 edges
8. `electron` - 7 edges
9. `el()` - 7 edges
10. `showPanel()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Controls verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/controls.png → README.md
- `Music verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/music.png → README.md
- `Soul tray icon` --references--> `Soul Windows desktop island`  [EXTRACTED]
  src/icon.png → README.md
- `Soul application icon` --references--> `Soul Windows desktop island`  [EXTRACTED]
  src/icon-large.png → README.md
- `harness()` --calls--> `createClient()`  [EXTRACTED]
  tests/controls.test.js → src/controls.js

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "Desktop Island Interface"
Cohesion: 0.13
Nodes (44): act(), button(), controlMedia(), doSearch(), el(), empty(), flowTo(), step() (+36 more)

### Community 1 - "App Features and Design"
Cohesion: 0.06
Nodes (38): Controls verification screenshot, Music verification screenshot, Verified clipboard integration, Verified controls integration, Verified music integration, Soul validation and limitations, Application shortcuts, Encrypted rich clipboard (+30 more)

### Community 2 - "Windows App Coordination"
Cohesion: 0.08
Nodes (33): activeSize, { app, BrowserWindow, ipcMain, screen, shell, dialog, clipboard, ClipboardItem, safeStorage, Tray, Menu, nativeImage, globalShortcut,powerMonitor }, apps, canvas, captureClipboard(), clipFormats, controls, createWindow() (+25 more)

### Community 3 - "Desktop App Components"
Cohesion: 0.07
Nodes (23): {app,BrowserWindow,clipboard,ClipboardItem}, assert, fs, path, root, {app,BrowserWindow,clipboard}, assert, childProcess (+15 more)

### Community 4 - "Desktop App Components"
Cohesion: 0.08
Nodes (22): {app,BrowserWindow,clipboard,dialog,screen,safeStorage}, assert, childProcess, controls, fs, path, powerCalls, profile (+14 more)

### Community 5 - "Rich Clipboard History"
Cohesion: 0.10
Nodes (20): capture(), {createHash}, formats, key(), trim(), validPayloads(), clips, history() (+12 more)

### Community 6 - "Desktop App Components"
Cohesion: 0.08
Nodes (24): build, appId, asarUnpack, files, productName, win, description, devDependencies (+16 more)

### Community 7 - "Desktop App Components"
Cohesion: 0.13
Nodes (13): {app,BrowserWindow,clipboard,ClipboardItem,safeStorage}, assert, controls, fs, media, path, payloads, png (+5 more)

### Community 8 - "Native Windows Controls"
Cohesion: 0.43
Nodes (5): Await-WinRT(), Media-Session(), Read-Playback(), Read-Radios(), Set-Radio()

## Knowledge Gaps
- **21 isolated node(s):** `electron-builder`, `Controls verification screenshot`, `Music verification screenshot`, `Soul tray icon`, `Soul application icon` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 146 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `Desktop App Components` to `Windows App Coordination`, `Desktop App Components`, `Desktop App Components`, `Desktop App Components`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `init()` (e.g. with `renderer.js` and `setExpanded()`) actually correct?**
  _`init()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `electron-builder`, `Controls verification screenshot`, `Music verification screenshot` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desktop Island Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.12525252525252525 - nodes in this community are weakly interconnected._
- **Should `App Features and Design` be split into smaller, more focused modules?**
  _Cohesion score 0.06072874493927125 - nodes in this community are weakly interconnected._
- **Should `Windows App Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.07827260458839407 - nodes in this community are weakly interconnected._
- **Should `Desktop App Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._
## Extraction limitations
The undirected graph collapses 51 relationship variants and includes 7 self-loops. No missing or dangling endpoints were detected. Full relationships remain in extraction-audit.json. The legacy media.ps1 key dispatcher produced no AST symbols. Inline semantic token usage was not measured.
