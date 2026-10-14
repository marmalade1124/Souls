# Graph Report - Soul  (2026-10-14)

## Corpus Check
- 39 files · ~152,804 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 2, (none) 1, .ico 1)

## Summary
- 332 nodes · 527 edges · 20 communities (18 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Desktop Island Interface
- App Features and Design
- Windows App Coordination
- Desktop App Components
- Rich Clipboard History
- Desktop App Components
- App and File Discovery
- Desktop App Components
- Desktop App Components
- Desktop App Components
- Native Windows Controls
- Desktop App Components
- Desktop App Components
- Rich Clipboard History
- Native Windows Controls
- Native Windows Controls
- Desktop App Components
- Desktop App Components

## God Nodes (most connected - your core abstractions)
1. `Soul Windows desktop island` - 30 edges
2. `init()` - 20 edges
3. `renderClips()` - 10 edges
4. `act()` - 9 edges
5. `setExpanded()` - 9 edges
6. `initSliders()` - 9 edges
7. `electron` - 8 edges
8. `toast()` - 8 edges
9. `doSearch()` - 8 edges
10. `createSearchService()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Controls verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/controls.png → README.md
- `Mascot verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/mascot.png → README.md
- `Music verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/music.png → README.md
- `Search verification screenshot` --references--> `Soul Windows desktop island`  [EXTRACTED]
  docs/screenshots/search.png → README.md
- `Soul flame sprite sheet` --references--> `Soul Windows desktop island`  [EXTRACTED]
  src/assets/soul-flame-sheet.png → README.md

## Import Cycles
- None detected.

## Communities (20 total, 2 thin omitted)

### Community 0 - "Desktop Island Interface"
Cohesion: 0.12
Nodes (47): act(), button(), controlMedia(), doSearch(), el(), empty(), flowTo(), step() (+39 more)

### Community 1 - "App Features and Design"
Cohesion: 0.05
Nodes (42): Controls verification screenshot, Mascot verification screenshot, Music verification screenshot, Search verification screenshot, Verified clipboard integration, Verified controls integration, Verified music integration, Soul validation and limitations (+34 more)

### Community 2 - "Windows App Coordination"
Cohesion: 0.08
Nodes (34): activeSize, { app, BrowserWindow, ipcMain, screen, shell, dialog, clipboard, ClipboardItem, safeStorage, Tray, Menu, nativeImage, globalShortcut,powerMonitor }, apps, canvas, captureClipboard(), clipFormats, controls, {createSearchService} (+26 more)

### Community 3 - "Desktop App Components"
Cohesion: 0.06
Nodes (30): author, build, appId, asarUnpack, files, nsis, productName, win (+22 more)

### Community 4 - "Rich Clipboard History"
Cohesion: 0.10
Nodes (20): capture(), {createHash}, formats, key(), trim(), validPayloads(), clips, history() (+12 more)

### Community 5 - "Desktop App Components"
Cohesion: 0.12
Nodes (17): searchFiles(), scoreMatch(), {createClient}, createSearchService(), cancel(), flush(), publish(), query() (+9 more)

### Community 6 - "App and File Discovery"
Cohesion: 0.16
Nodes (10): discoverApps(), fs, path, installedApps(), assert, fs, os, path (+2 more)

### Community 7 - "Desktop App Components"
Cohesion: 0.13
Nodes (13): {app,BrowserWindow,clipboard,ClipboardItem,safeStorage}, assert, controls, fs, media, path, payloads, png (+5 more)

### Community 8 - "Desktop App Components"
Cohesion: 0.22
Nodes (8): createMascot(), paint(), play(), tick(), stop(), assert, {createMascot}, test

### Community 9 - "Desktop App Components"
Cohesion: 0.15
Nodes (10): {app,BrowserWindow,globalShortcut,shell}, assert, base, controls, fixture, fs, path, profile (+2 more)

### Community 10 - "Native Windows Controls"
Cohesion: 0.20
Nodes (9): createClient(), request(), stop(), assert, {createClient}, {EventEmitter}, harness(), {PassThrough} (+1 more)

### Community 11 - "Desktop App Components"
Cohesion: 0.17
Nodes (10): {app,BrowserWindow,clipboard,dialog,screen,safeStorage}, assert, childProcess, controls, fs, path, powerCalls, profile (+2 more)

### Community 12 - "Desktop App Components"
Cohesion: 0.20
Nodes (7): {app,BrowserWindow,clipboard}, assert, childProcess, fs, nativeControls, path, root

### Community 13 - "Rich Clipboard History"
Cohesion: 0.25
Nodes (5): {app,BrowserWindow,clipboard,ClipboardItem}, assert, fs, path, root

### Community 14 - "Native Windows Controls"
Cohesion: 0.43
Nodes (5): Await-WinRT(), Media-Session(), Read-Playback(), Read-Radios(), Set-Radio()

### Community 15 - "Native Windows Controls"
Cohesion: 0.33
Nodes (3): {createInterface}, path, {spawn}

### Community 16 - "Desktop App Components"
Cohesion: 0.50
Nodes (3): electron, { contextBridge, ipcRenderer }, invoke()

### Community 17 - "Desktop App Components"
Cohesion: 1.00
Nodes (3): Open-WindowsIndex(), Read-Provider(), Read-Search()

## Knowledge Gaps
- **25 isolated node(s):** `electron-builder`, `Living flame mascot`, `Controls verification screenshot`, `Music verification screenshot`, `Search verification screenshot` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 189 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `Desktop App Components` to `Windows App Coordination`, `Desktop App Components`, `Desktop App Components`, `Desktop App Components`, `Desktop App Components`, `Desktop App Components`, `Rich Clipboard History`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `init()` (e.g. with `renderer.js` and `setExpanded()`) actually correct?**
  _`init()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `electron-builder`, `Living flame mascot`, `Controls verification screenshot` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desktop Island Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.11613475177304965 - nodes in this community are weakly interconnected._
- **Should `App Features and Design` be split into smaller, more focused modules?**
  _Cohesion score 0.05426356589147287 - nodes in this community are weakly interconnected._
- **Should `Windows App Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.07564102564102564 - nodes in this community are weakly interconnected._
- **Should `Desktop App Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
## Extraction integrity and limits

Updated after the mascot alpha-blending correction. No missing or dangling endpoints. Undirected build collapses 69 relationship variants; 7 raw self-loops. Full extraction retained in extraction-audit.json. scripts/mock-search.cjs and src/media.ps1 yield no AST symbols. This is a map, not runtime proof.
