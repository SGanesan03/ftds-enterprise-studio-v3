# FactoryTalk Design Studio — Enterprise Angular Web IDE (v3.0)

An enterprise-grade Angular 18 web IDE replicating Rockwell Automation's **FactoryTalk Design Studio (FTDS)** architecture with modular component separation (`.html`, `.scss`, `.ts`, `.spec.ts`), multi-language PLC programming (**Ladder Diagram**, **Structured Text**, **Function Block Diagram**), 3-tier scoped tag management, User-Defined Types (UDTs), Smart Objects instantiation, Tag Cross-Reference tracing, and FactoryTalk Vault Git history.

---

## 1. Architecture: Production Kotlin + GraphQL vs. JSON Repository Mapping

### Real Production FTDS Stack (Kotlin + GraphQL + Azure)
In Rockwell Automation's cloud-native FactoryTalk Design Studio:
1. **Kotlin GraphQL Gateway:** The Angular SPA communicates with a Kotlin Ktor/Spring GraphQL backend. A single nested query (`GetProjectModel`) resolves the `Controller -> Tasks -> Programs -> Routines -> Scoped Tags -> UDTs` tree in one round-trip, while mutations (`createRoutine`, `updateRoutineCode`, `upsertTag`, `commitToVault`) persist changes to **FactoryTalk Vault** and **Logix Echo**.
2. **GraphQL Subscriptions:** Live tag values stream from the virtual backplane to highlight energized ladder rungs and FBD wires in real time.

### Standalone JSON Store Architecture (`assets/data/ftds-workspace-db.json`)
To ensure **zero-OOM installation, instant local execution, and static cloud deployment** (Vercel, Netlify, GitHub Pages, or Nginx) without requiring a JVM backend:
- **`src/assets/data/ftds-workspace-db.json`** holds the complete nested `ProjectModel` schema.
- **`WorkspaceDataService`** loads the JSON via `HttpClient`, runs an in-browser **Soft-PLC Scan Engine** to compute live Ladder/FBD power flow whenever tags change, persists edits in `localStorage`, and provides **Export JSON** & **Reset DB** controls.

---

## 2. Project File Structure (Clean `.html`, `.scss`, `.ts`, `.spec.ts` Separation)

```text
src/
 ├── assets/data/ftds-workspace-db.json
 └── app/
      ├── core/
      │    ├── models/plc.models.ts
      │    └── services/
      │         ├── workspace-data.service.ts & .spec.ts
      │         └── navigation-handler.service.ts & .spec.ts
      ├── shared/components/
      │    ├── st-code-editor/       (.html, .scss, .ts, .spec.ts)
      │    ├── ladder-editor/        (.html, .scss, .ts, .spec.ts)
      │    └── fbd-editor/           (.html, .scss, .ts, .spec.ts)
      ├── features/workspace/
      │    ├── routine-view/         (.html, .scss, .ts, .spec.ts)
      │    ├── tags-view/            (.html, .scss, .ts, .spec.ts)
      │    ├── hardware-view/        (.html, .scss, .ts, .spec.ts)
      │    └── udt-view/             (.html, .scss, .ts, .spec.ts)
      ├── app.component.html / .scss / .ts / .spec.ts
      ├── app.routes.ts
      └── app.config.ts
```

---

## 3. Local Run, Unit Tests & Git Deployment

### Local Development
```bash
npm install --no-audit --no-fund
npm start
```

### Run Unit Tests
```bash
npm test
```

### Deploy to GitHub Pages
Push to the `main` branch — the included GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically builds with the correct `--base-href` and publishes to the `gh-pages` branch.

Enable GitHub Pages in your repo: **Settings → Pages → Source: Deploy from branch → `gh-pages` / `/ (root)`**.

The live URL will be: `https://<your-username>.github.io/ftds-enterprise-studio-v3/`

To deploy manually:
```bash
npm run deploy
```
