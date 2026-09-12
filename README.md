# Mold Press

[한국어](README.ko.md) · English

A browser-based manufacturing workspace: model a part, create a simplified mold, run a press cycle, and assemble the resulting pieces. Runs locally, with no account or backend.

![Mold Press workspace](docs/images/press.png)

## Run

Open **[index.html](<https://jtech-co.github.io/Mold-Press/>)** in a desktop browser. Keep the adjacent `js/` and `css/` folders with the HTML. The browser loads the files directly; no installation or build is required to use the app.

For a stable local address and browser storage, serve this folder:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000). Use the same address and port to return to the same browser save. Direct `file://` storage behavior depends on the browser. A desktop viewport of at least 1400 × 850 is recommended; this interface is not optimized for phones.

The built-in WebGL renderer works without network access. When available, the app loads the existing optional **Three.js 0.152.2** renderer from jsDelivr. If GPU rendering is unavailable, it falls back to Canvas 3D. Procedural finishes require no external image files; Canvas uses simpler lighting.

## Workflow

| Stage | What you can do |
| --- | --- |
| **Studio** | Add primitives or import meshes; move, rotate, scale, group, align, measure, split and perform mesh booleans. Draw 2D sketches and create extrude, cut, revolve, sweep and loft features. |
| **Tooling** | Set a parting axis/position; generate cavity and core geometry, pins, runners, cooling paths and simplified side cores. Inspect layers or a transparent mold. |
| **Press** | Choose a ready mold and material; press one mold or all molds through Close → Form → Cool → Open → Eject. Completed parts enter the tray. |
| **Assembly** | Bring produced parts together, align or mate them, inspect collisions, explode the assembly and export. |

To try the supplied sample: **split the body → Tooling → generate all molds → Press → choose a material → press all → Assembly → auto assemble**. Selecting a ready mold targets exactly that body, even if its source belongs to a group. Batch transitions preserve your zoom, orbit and pan; **F** explicitly fits the view.

## Materials and visual finishes

| Material | Viewport appearance |
| --- | --- |
| ABS | Fine satin grain |
| PP | Subtle, waxy semi-gloss |
| PC | Smooth gloss; optional clear view, with transmission in Three.js High quality |
| Nylon | Matte fine grain |
| Aluminum 6061 | Directional brushed metal |
| Zinc | Fine metallic variation |
| CF Nylon | Rough, short-fiber variation; not woven carbon cloth |

Molds use a machined steel finish. The press includes coated panels, polished rods, fasteners, cabinet vents and control-panel details. Surfaces stay attached to the object as it moves and are shared by the blank, formed part and completed parts. Finishes affect appearance only.

## Files and saving

| Format | Import | Export | Notes |
| --- | --- | --- | --- |
| `.moldpress.json` | Yes | Yes | Full editable project, including tooling, sketches, features, tray and assembly. |
| STL | Binary / ASCII | Binary | Millimetres; geometry only. |
| OBJ | Yes | No | Mesh geometry in millimetres. |
| GLB | Uncompressed glTF 2.0 | Yes | Metres on disk, converted to/from internal millimetres. Import does not restore external textures, animations or compressed geometry. |
| ZIP | No | Yes | One STL per exported body. |
| PNG | No | Yes | Viewport capture with a project caption. |

GLB export includes base material colors and metallic/roughness values. The procedural viewport grain and press animation are not baked into exported files. Files over 20 MB are rejected on import; mesh and project capacity limits also apply.

Projects autosave to the current browser/site storage. **Export JSON** for a portable backup. The **Share** action creates a clone snapshot link for the same browser and site storage; it is not a cloud link and does not transfer a project to another device. Send the JSON file to share across devices.

**Reset** asks for confirmation, clears the current project and undo/redo history, and opens an empty Studio. A running press pauses while confirmation is open. Cancel resumes it. Reset preserves the current UI language and independent clone snapshots; it cannot be undone.

## Controls

| Input | Action |
| --- | --- |
| Drag / wheel | Orbit / zoom |
| Right drag | Pan |
| Shift + selection | Multi-select |
| V / G / R / S / M | Select / move / rotate / scale / measure |
| F | Fit view |
| Delete | Delete selection |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z or Ctrl + Y | Redo |
| Ctrl/Cmd + D | Duplicate |
| Esc | Cancel the current interaction or reset confirmation |

## Development

**Version: 1.1.1.** The application now runs from a small `index.html` plus functional modules in `js/` and `css/`. Project schema/storage remain version 1, preserving compatibility with the supplied Fix 6 project files.

Edit `js/` and `css/`, then reload the browser. See the [module guide](docs/ARCHITECTURE.md) for file responsibilities. With Python 3.10 or later, validate references or copy a deployable static folder:

```bash
python build.py
python build.py --check
```

The build uses only the Python standard library and copies the runtime files to `dist/site/`. `--check` checks missing, duplicate and unreferenced assets without writing output. It never merges JavaScript or CSS into HTML. Node.js is used for JavaScript syntax checks; Python Playwright is used for browser regressions.

```bash
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/check_syntax.py
python tests/kernel_contract.py
python tests/static_site.py
python tests/browser_workflow.py
python tests/storage_tests.py
python tests/press_selection_edges.py
python tests/release_smoke.py
python tests/release_smoke.py --three
```

The `--three` check requires access to the pinned Three.js CDN. Other suites block external requests. To exercise the CPU fallback, set `MP_RENDERER=canvas` before running `release_smoke.py`. Set `CHROMIUM_PATH` to use a specific Chromium executable. Tests run in isolated browser contexts and write results to `tests/output/`; they do not operate on your active browser project.

```text
index.html                  Small entrypoint with external file references
js/core/, js/app/            Configuration, application state and action handlers
js/ui/, js/cad/              Screen components and CAD integration
js/geometry/, js/sketch/     Geometry and sketch feature kernels
js/assembly/, js/tooling/    Mates and mold geometry
js/press/                   Machine geometry and cycle motion
js/rendering/, js/viewport/  Renderers, camera and pointer controls
js/materials/               Material data and procedural finishes
js/project/, js/io/         Persistence, validation and file formats
js/vendor/                  Existing React runtime
css/                        Ordered styles grouped by layout and feature
assets.py                   Asset validation and complete-app fingerprint
build.py                    Copy runtime files to dist/site/
package.py                  Verified app and source ZIP packaging
tests/                      Regressions and synthetic fixtures
docs/ARCHITECTURE.md         Module map and dependency order
archive/v1.1.0/             Original single-file release, retained locally
```

## GitHub distribution

Commit `js/`, `css/`, `index.html`, scripts, tests and documentation to your repository. The included CI workflow checks asset-reference integrity, syntax and offline browser regressions. See [release notes](docs/CHANGELOG.md) and [verification](docs/QA.md).

```bash
python package.py
```

This creates `dist/Mold-Press-1.1.1.zip` (app with its JS/CSS folders), `dist/Mold-Press-1.1.1-source.zip` (editable sources and tests), and SHA-256 checksums. Packaging requires successful reports for the current HTML and all referenced JS/CSS files and excludes generated test output and the historical archive.

For GitHub Pages, set **Settings → Pages → Build and deployment → Source: GitHub Actions**, then manually run the included **Deploy GitHub Pages** workflow. It publishes the application HTML, JS/CSS folders and third-party notices from `dist/site/`. The included workflow requires manual dispatch to publish the site. See the [official GitHub Pages guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Scope and attribution

Mold Press is an interactive geometry and process emulation, not CAD/CAE validation. It does not solve melt flow, heat transfer, press loads or production safety. Thickness/draft/undercut checks are sampled approximations. Material shrinkage and cycle values are illustrative; Aluminum 6061 uses a conceptual compression/forging animation. Tessellated geometry operations can fail on complex or unsuitable meshes.

Browser verification covers Chromium's local WebGL, optional Three.js and Canvas fallback. Hardware-specific GPU behavior and other browser engines are not certified. See [QA](docs/QA.md) for the recorded scope.

Third-party license information is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Mold Press is released under the [MIT License](LICENSE), as established in this repository.
