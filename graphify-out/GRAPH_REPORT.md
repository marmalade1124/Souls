# Graph Report - Soul  (2026-10-14)

## Corpus Check
- 39 files · ~152,504 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 2, (none) 1, .ico 1)

## Summary
- 331 nodes · 526 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Desktop Island Interface
- App Features and Design
- Desktop App Components
- Windows App Coordination
- Desktop App Components
- Desktop App Components
- Rich Clipboard History
- Regression Test Coverage
- Desktop App Components
- Desktop App Components
- Native Windows Controls
- Native Windows Controls
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

## Communities (15 total, 2 thin omitted)

### Community 0 - "Desktop Island Interface"
Cohesion: 0.12
Nodes (47): act(), button(), controlMedia(), doSearch(), el(), empty(), flowTo(), step() (+39 more)

### Community 1 - "App Features and Design"
Cohesion: 0.05
Nodes (42): Controls verification screenshot, Mascot verification screenshot, Music verification screenshot, Search verification screenshot, Verified clipboard integration, Verified controls integration, Verified music integration, Soul validation and limitations (+34 more)

### Community 2 - "Desktop App Components"
Cohesion: 0.06
Nodes (28): electron, {app,BrowserWindow,clipboard,ClipboardItem}, assert, fs, path, root, {app,BrowserWindow,clipboard,dialog,screen,safeStorage}, assert (+20 more)

### Community 3 - "Windows App Coordination"
Cohesion: 0.08
Nodes (34): activeSize, { app, BrowserWindow, ipcMain, screen, shell, dialog, clipboard, ClipboardItem, safeStorage, Tray, Menu, nativeImage, globalShortcut,powerMonitor }, apps, canvas, captureClipboard(), clipFormats, controls, {createSearchService} (+26 more)

### Community 4 - "Desktop App Components"
Cohesion: 0.06
Nodes (30): author, build, appId, asarUnpack, files, nsis, productName, win (+22 more)

### Community 5 - "Desktop App Components"
Cohesion: 0.10
Nodes (22): discoverApps(), fs, path, searchFiles(), installedApps(), scoreMatch(), {createClient}, createSearchService() (+14 more)

### Community 6 - "Rich Clipboard History"
Cohesion: 0.10
Nodes (20): capture(), {createHash}, formats, key(), trim(), validPayloads(), clips, history() (+12 more)

### Community 7 - "Regression Test Coverage"
Cohesion: 0.13
Nodes (13): createMascot(), paint(), play(), tick(), stop(), assert, {createMascot}, test (+5 more)

### Community 8 - "Desktop App Components"
Cohesion: 0.13
Nodes (13): {app,BrowserWindow,clipboard,ClipboardItem,safeStorage}, assert, controls, fs, media, path, payloads, png (+5 more)

### Community 9 - "Desktop App Components"
Cohesion: 0.15
Nodes (10): {app,BrowserWindow,globalShortcut,shell}, assert, base, controls, fixture, fs, path, profile (+2 more)

### Community 10 - "Native Windows Controls"
Cohesion: 0.20
Nodes (9): createClient(), request(), stop(), assert, {createClient}, {EventEmitter}, harness(), {PassThrough} (+1 more)

### Community 11 - "Native Windows Controls"
Cohesion: 0.43
Nodes (5): Await-WinRT(), Media-Session(), Read-Playback(), Read-Radios(), Set-Radio()

### Community 12 - "Desktop App Components"
Cohesion: 1.00
Nodes (3): Open-WindowsIndex(), Read-Provider(), Read-Search()

## Knowledge Gaps
- **25 isolated node(s):** `electron-builder`, `Living flame mascot`, `Controls verification screenshot`, `Music verification screenshot`, `Search verification screenshot` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `Desktop App Components` to `Desktop App Components`, `Desktop App Components`, `Windows App Coordination`, `Desktop App Components`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `init()` (e.g. with `renderer.js` and `setExpanded()`) actually correct?**
  _`init()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `electron-builder`, `Living flame mascot`, `Controls verification screenshot` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desktop Island Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.11613475177304965 - nodes in this community are weakly interconnected._
- **Should `App Features and Design` be split into smaller, more focused modules?**
  _Cohesion score 0.05426356589147287 - nodes in this community are weakly interconnected._
- **Should `Desktop App Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05853658536585366 - nodes in this community are weakly interconnected._
- **Should `Windows App Coordination` be split into smaller, more focused modules?**
  _Cohesion score 0.07564102564102564 - nodes in this community are weakly interconnected._
## Extraction integrity and limits

Graph updated for the living mascot integration. No missing or dangling endpoints were found. The undirected build collapses 69 relationship variants; 7 self-loops remain in raw extraction. Full relationships are retained in extraction-audit.json. scripts/mock-search.cjs and src/media.ps1 yield no AST symbols. Semantic asset descriptions are manually grounded; the graph is a map, not runtime proof.
