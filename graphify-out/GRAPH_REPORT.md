# Graph Report - Soul  (2026-10-14)

## Corpus Check
- Corpus is ~16,318 words - fits in a single context window. You may not need a graph.

## Summary
- 338 nodes · 549 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Desktop Island Interface
- App Features and Design
- Windows App Coordination
- Regression Test Coverage
- Desktop App Components
- Desktop App Components
- Rich Clipboard History
- Desktop App Components
- Desktop App Components
- Desktop App Components
- Native Windows Controls
- Native Windows Controls
- Desktop App Components

## God Nodes (most connected - your core abstractions)
1. `Soul Windows desktop island` - 27 edges
2. `init()` - 20 edges
3. `renderClips()` - 10 edges
4. `act()` - 9 edges
5. `setExpanded()` - 9 edges
6. `doSearch()` - 9 edges
7. `initSliders()` - 9 edges
8. `electron` - 8 edges
9. `toast()` - 8 edges
10. `build` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Controls verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/controls.png → README.md
- `Music verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/music.png → README.md
- `Search verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/search.png → README.md
- `Soul tray icon` --references--> `Soul Windows desktop island`  [EXTRACTED]
  src/icon.png → README.md
- `Soul application icon` --references--> `Soul Windows desktop island`  [EXTRACTED]
  src/icon-large.png → README.md

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "Desktop Island Interface"
Cohesion: 0.12
Nodes (46): act(), button(), controlMedia(), doSearch(), el(), empty(), flowTo(), step() (+38 more)

### Community 1 - "App Features and Design"
Cohesion: 0.06
Nodes (39): Controls verification screenshot, Music verification screenshot, Search verification screenshot, Verified clipboard integration, Verified controls integration, Verified music integration, Soul validation and limitations, Application shortcuts (+31 more)

### Community 2 - "Windows App Coordination"
Cohesion: 0.08
Nodes (34): activeSize, { app, BrowserWindow, ipcMain, screen, shell, dialog, clipboard, ClipboardItem, safeStorage, Tray, Menu, nativeImage, globalShortcut,powerMonitor }, apps, canvas, captureClipboard(), clipFormats, controls, {createSearchService} (+26 more)

### Community 3 - "Regression Test Coverage"
Cohesion: 0.08
Nodes (27): discoverApps(), fs, path, searchFiles(), installedApps(), fs, path, queryIndex() (+19 more)

### Community 4 - "Desktop App Components"
Cohesion: 0.06
Nodes (30): author, build, appId, asarUnpack, files, nsis, productName, win (+22 more)

### Community 5 - "Desktop App Components"
Cohesion: 0.08
Nodes (20): {app,BrowserWindow,clipboard,dialog,screen,safeStorage}, assert, childProcess, controls, fs, path, powerCalls, profile (+12 more)

### Community 6 - "Rich Clipboard History"
Cohesion: 0.10
Nodes (20): capture(), {createHash}, formats, key(), trim(), validPayloads(), clips, history() (+12 more)

### Community 7 - "Desktop App Components"
Cohesion: 0.09
Nodes (18): electron, {app,BrowserWindow,clipboard,ClipboardItem}, assert, fs, path, root, {app,BrowserWindow,globalShortcut,shell}, assert (+10 more)

### Community 8 - "Desktop App Components"
Cohesion: 0.14
Nodes (21): scanTree(), applyChanges(), cache, changes, {createInterface}, entries, fs, fsp (+13 more)

### Community 9 - "Desktop App Components"
Cohesion: 0.13
Nodes (13): {app,BrowserWindow,clipboard,ClipboardItem,safeStorage}, assert, controls, fs, media, path, payloads, png (+5 more)

### Community 10 - "Native Windows Controls"
Cohesion: 0.20
Nodes (9): createClient(), request(), stop(), assert, {createClient}, {EventEmitter}, harness(), {PassThrough} (+1 more)

### Community 11 - "Native Windows Controls"
Cohesion: 0.43
Nodes (5): Await-WinRT(), Media-Session(), Read-Playback(), Read-Radios(), Set-Radio()

### Community 12 - "Desktop App Components"
Cohesion: 0.70
Nodes (5): createSearchService(), query(), rebuild(), start(), stop()

## Knowledge Gaps
- **22 isolated node(s):** `electron-builder`, `Controls verification screenshot`, `Music verification screenshot`, `Search verification screenshot`, `Soul tray icon` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 191 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `Desktop App Components` to `Desktop App Components`, `Windows App Coordination`, `Desktop App Components`, `Desktop App Components`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `init()` (e.g. with `renderer.js` and `setExpanded()`) actually correct?**
  _`init()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `electron-builder`, `Controls verification screenshot`, `Music verification screenshot` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desktop Island Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.1211840888066605 - nodes in this community are weakly interconnected._
- **Should `App Features and Design` be split into smaller, more focused modules?**
  _Cohesion score 0.05897435897435897 - nodes in this community are weakly interconnected._
- **Should `Windows App Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.07564102564102564 - nodes in this community are weakly interconnected._
- **Should `Regression Test Coverage` be split into smaller, more focused modules?**
  _Cohesion score 0.07507507507507508 - nodes in this community are weakly interconnected._
## Extraction limitations
The undirected graph collapses 61 relationship variants and includes 7 self-loops. No missing or dangling endpoints were detected. Full relationships remain in extraction-audit.json. The legacy media.ps1 dispatcher and mock-search.cjs yielded no AST symbols. Inline semantic token usage was not measured.
