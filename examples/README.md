# Examples quickstart

The examples are static HTML files. You can open them directly in a browser or via the dev server.

## Fastest way
1. From the repo root run `npm install` if dependencies are missing.
2. Start the local dev server: `npm run dev`.
3. Open http://localhost:8080/examples/digital-twin-ops-console.html to use the Fortified Digital Twin Ops Console.

## Offline file mode
If you prefer to open the HTML directly (e.g., `file://`), the console and defense monitor will still run. If your browser blocks the SubtleCrypto API in file mode, the console falls back to a lightweight FNV-1a hash and logs a warning in the custody timeline.

## What to look for
- The **Dashboard** shows guard status and the live custody log.
- **PIF Test & Controls** sanitizes prompts and records hashes.
- **Forensic Logs & Audit** lists agents and appends defense monitor alerts from `scripts/defense-app.js`.
- **PDF Report Preview** shows the print-ready view; use the ChainLock code `CobaltZero` and the export button to download the JSON package and open the print dialog.

## Integrating the defense monitor elsewhere
Include `scripts/defense-app.js` on any page. Listen for `defense-app:alert` events or read `window.__defenseAppEvents` to react to overlay, mutation, or network anomalies.
