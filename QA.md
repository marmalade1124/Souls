# Soul robustness checks

Validated on this Windows machine; this is not a guarantee for every Windows or hardware configuration.

| Area | Checks |
| --- | --- |
| Clipboard | Real Windows copies appear in Soul; capture while hidden; asynchronous reads; out-of-order responses; pause/clear during pending reads; duplicate suppression; 40-item and 20,000-character limits; encrypted storage; disk failure preserves visible in-memory text. |
| Motion | Interrupted open/close; reopening before dismissal finishes; rapid tabs; fade/shrink; icon morph; slider pointer release outside its input; reduced motion simulated; fixed native surface during animation. |
| Preferences | Invalid schemas, malformed JSON and unreadable encrypted history; recovery copy; atomic replacement; malformed/duplicate stored pins and roots; invalid clipboard entries; automatic retries after transient disk failures; navigation and shortcut opening continue during failed writes. |
| Native helper | Invalid output, out-of-order replies, command errors, exit/restart and timeout with queued actions; actual volume/brightness/playback reads on this hardware. |
| Dialogs and power | Simulated modal focus loss does not dismiss Soul; second simultaneous dialog rejected; cancelled action runs no command; confirmed restart schedules `/r /t 60`; cancel sends `/a`. No actual power action performed. |
| IPC | Another BrowserWindow cannot invoke Soul's API; invalid visibility, panel, setting, preference and clipboard-entry requests rejected. |
| Search | Case-insensitive matching; result limit in the last folder; overlapping roots; missing folders; dependency exclusion; time deadline enforced around folder reads; obsolete searches cancelled; stuck directory reads tested with fault injection. |
| Display | Simulated 640×480 display fits the island; simulated metrics change refits the window. |

Run unit checks with `node --test tests/*.test.js`. Electron scripts in `scripts/` use isolated profiles under `.soul-dev/`. `check-clipboard-live.cjs` temporarily writes sample copies and materializes/restores clipboard formats; run it by itself while the normal app is stopped. Other scripts substitute clipboard/native operations.

## Remaining real-world verification

- Physical monitor disconnect/reconnect, mixed DPI, rotation and changing primary monitor.
- Actual sleep/resume, lock/unlock and a long continuous runtime.
- Bluetooth/headset audio changes, multiple simultaneous music players and players without Windows media sessions.
- DDC/CI monitors with different capabilities and brightness ranges.
- Clipboard through Remote Desktop, clipboard-owner contention and very rapid copy bursts.
- Real access-denied/disconnected network folders; search timeout is bounded, but the underlying OS directory request may finish later.
- Actual restart/shutdown/lock, Windows-account encryption changes and loss of the DPAPI key.

## Current scope

Clipboard supports plain text, HTML/RTF, PNG/JPEG and Explorer file paths; arbitrary application-specific formats are excluded. Copies have a 4 MB payload limit and serialized history a 16 MB budget. File contents are not backed up. Music depends on what the active Windows player exposes. Radio tiles toggle power; network selection and pairing still use the separate Windows settings buttons. Unsupported hardware brightness uses explicitly labelled primary-screen software dimming. Sleep settings opens the Windows power page. Power and multiple-monitor enhancements are deferred.

## Feature expansion verification

- `check-features.cjs`: simulated title/artist/album/artwork rendering, empty player, seek-input dispatch, rejected IPC, Wi-Fi/Bluetooth toggle state, software dimming overlay and removal, image previews, formatted text and file payloads, encrypted history. Its controls and clipboard are isolated mocks.
- `check-clipboard-live.cjs`: actual Windows text capture while shown/hidden, PNG image, HTML and Explorer file clipboard round trips. Original clipboard formats are restored afterward.
- Native helper: actual active Brave media title/artist, artwork and timeline read; seek accepted at the existing playback position. Radio enumeration and setting Bluetooth to its existing on state succeeded. Off/on disconnection cycles were not performed.
- UI regression: all panels fit at their intended sizes, including the enlarged Music panel; opening/dismissal, tab switching, clipboard and transport checks pass. New clipboard unit tests cover malformed formats and payload/history limits.
- Still unverified: different players' artwork/seek behavior, Bluetooth permission denial on real policy-managed machines, Wi-Fi reconnection and hardware-blocked toggles, other displays' DDC/CI behavior, and dimming over exclusive fullscreen applications or the Windows secure desktop.

