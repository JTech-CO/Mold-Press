# Mold Press

English · [한국어](README.ko.md)

A browser workspace for modeling parts, creating simplified molds, running press cycles, and assembling the results. No account or backend required.

**[Open Mold Press](https://jtech-co.github.io/Mold-Press/)**

![Mold Press workspace](docs/images/press.png)

## Use

| Workspace | Purpose |
| --- | --- |
| Studio | Model a part with primitives, sketches, or imported meshes. |
| Tooling | Generate molds and inspect the parting plane, sections, and components. |
| Press | Choose a material, run a cycle, and collect finished parts. Pause, step, or replay the process. |
| Assembly | Position and mate produced parts, then export the assembly. |

Use the project library for named copies and recent revisions. Saves stay in this browser; export a project JSON file for a portable backup.

## Run locally

Serve this folder with Python:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000) in a desktop browser. Keep `index.html`, `js/`, and `css/` together. You can also open `index.html` directly; HTTP enables background workers and a consistent browser storage origin.

## About the molds

Mold Press illustrates geometry and manufacturing sequences. Its checks and animations do not establish production readiness.

Read the **[molds and materials guide](docs/MOLDING.md)** for molding fundamentals, common injection materials, and how this app differs from real tooling.

## License

[MIT](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
