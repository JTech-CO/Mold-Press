# Changelog

## Workspace improvements - 2026-09-12

- Add crease-preserving render normals, contact shading and Fast/Standard/High quality controls across renderers.
- Add display-only capped sections and mold opening-gap controls.
- Correct side-core movement for every parting axis and press coordinate conversion.
- Track the eight implementation stages in [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 1.1.1 - 2026-09-08

- Replace the bundled HTML entrypoint with external deferred scripts and stylesheet links.
- Split runtime code into function-oriented `js/` folders and 13 CSS files while preserving cascade order.
- Separate app actions, view methods, CAD extensions, rendering engines, mold/machine geometry and file formats.
- Format source files for editing; keep third-party vendor files unchanged.
- Change build, ZIP and GitHub Pages output to include all runtime assets.
- Fingerprint HTML and all JS/CSS together so stale test reports cannot certify changed modules.
- Add pre-refactor geometry/sketch/mate signatures and document the dependency map in [ARCHITECTURE.md](ARCHITECTURE.md).
- Preserve the previous release locally in `archive/v1.1.0/`; exclude historical archives from Git.
- Normalize typographic dashes in current documentation and UI text to hyphens or colons.
- Retain the repository MIT license and include it in site and ZIP output.

## 1.1.0 - 2026-09-08

### Release structure

- Use `index.html` as the portable app and static hosting entrypoint.
- Extract the supplied inline implementation into named files under `src/`; preserve the embedded React and CAD/mesh kernels.
- Build deterministically with `python build.py`. Remove the current build/test dependency on the absent Fix 5 HTML.
- Replace the Fix-specific readmes with English and Korean usage, development and distribution documentation.
- Keep the original supplied files under `archive/fix6/`; their old QA results describe Fix 6 only.

### Appearance

- Add seven procedural material profiles, machined mold steel, coated machine panels and polished rods.
- Use object coordinates for finishes in local WebGL, Three.js and the Canvas fallback.
- Add a generated reflection environment for the Three.js metal surfaces and release its GPU resources on disposal.
- Add crown fasteners, cabinet vents, screen details and a stop-button model to the press.
- Update material swatches and show `v1.1` in the app header.

### Fixes and hardening

- Normalize unknown project, body and tray materials, including property names such as `constructor`; derive tray material from its validated part. Previously an unknown tray material could crash the UI.
- Reject invalid mold axes, positions and pin counts, and missing/duplicate object IDs before accepting a project.
- Honor a valid zero pin count instead of replacing it with four pins.
- Replace project fields on JSON import so attributes from the previous project are not retained.
- Order transparent local WebGL records by camera depth and handle unspecified opacity consistently.
- Keep the local renderer available when the optional Three.js setup fails.
- Update the document's language attribute when changing KR/EN.
- Make inherited browser scripts read UTF-8 explicitly and return a failure exit code when their checks fail.

### Verification

- Retain the supplied workflow, reset race and selection-edge regressions.
- Add real HTTP-origin autosave/reload and reset/reload checks, malformed-project cases, and real JSON/STL/GLB/ZIP/PNG download checks.
- Verify the existing CAD transaction's failed-edit history protection; it was already present in Fix 6 and is not claimed as a new fix.
- See [QA.md](QA.md) for the exact tested build and boundaries.
