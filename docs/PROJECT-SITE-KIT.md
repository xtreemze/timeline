# Xtreemze project-site kit

Status: first extraction hosted by Lūm; public contract intended to move to a dedicated repository without changing consumers.

## Purpose

The project-site kit is a framework-neutral presentation layer for GitHub Pages and other static project sites. Static structure stays semantic HTML and CSS. JavaScript is added only for behavior that genuinely needs state, interaction, or a reusable renderer.

The baseline is **Vite 8 or newer**. The site toolchain must not depend on **esbuild**. Vite 8 uses Rolldown and Oxc by default; consumers should not opt back into `build.minify: "esbuild"` or plugins that require `transformWithEsbuild`.

## Architecture

Use this order:

```
semantic HTML + native CSS
        ↓
native browser APIs
        ↓
small Lit custom elements for stateful reusable UI
        ↓
host adapters for product-specific state
```

Lit is an implementation detail of the reusable custom elements, not an application framework requirement. React, Solid, Vue, plain HTML, or another host can consume the elements through properties, DOM events, CSS custom properties, and CSS parts. Presentation theming uses `--xt-project-*` variables such as `--xt-project-font`, `--xt-project-paper`, `--xt-project-ink`, `--xt-project-accent`, and `--xt-project-focus`.

The kit currently registers:

- `<xt-project-timeline>` — the compact timeline projection extracted from Lūm.
- `<xt-project-graph>` — the compact relationship graph projection extracted from Lūm.
- `<xt-project-media-viewer>` — domain-neutral image pan/zoom viewer.
- `runProjectViewTransition(update)` — progressive enhancement for same-document state changes.

The standalone project-site bundle registers only the `xt-project-*` names. The separate Lūm embed bundle keeps its existing `luum-embed-*` names and also re-exports the generic API for compatibility.

## Canonical state and adapters

The kit never owns product state. It receives projected display records from the host.

For graph and timeline data, keep canonical IDs in the owning application. Lūm remains the authority for Lūm entity/relationship/occurrence/place semantics; layout coordinates and visual state are disposable projections.

For other Xtreemze capabilities:

- **Slipmat playback** — presentation pages may project playback controls or demonstrations through a future adapter, but the Slipmat playback engine remains the single playback authority.
- **Slipmat slideshow/media** — reuse the existing slideshow/model contracts when a multi-item media presentation is required. Do not grow `xt-project-media-viewer` into a competing slideshow state machine.
- **Verge conference/chat** — embed conferencing, chat, screen/file sharing through a bounded room/media adapter. The project site must not own transport, room, device, or peer state.
- **Showcase** — consume certified screenshots/video as immutable build artifacts. Showcase capture/render/verification remains CI infrastructure, not runtime site state.

## View Transitions and motion

Cross-document presentation navigation opts into the native View Transitions API through `project-site.css`:

```css
@view-transition {
  navigation: auto;
}
```

The API is progressive enhancement. Same-document updates can use `runProjectViewTransition()`. It skips animation when `prefers-reduced-motion: reduce` is active, when the browser does not support the API, or while another document transition is active.

Use transitions where continuity explains a relationship:

- landing → onboarding/detail;
- capability card → live embedded example;
- showcase gallery → focused media;
- timeline/graph selection → contextual detail;
- conference lobby → room;
- media library → focused playback surface.

Do not animate every navigation. Do not make animation completion authoritative state. Use Web Animations API only when an interaction needs cancellable/reversible imperative motion that CSS or View Transitions cannot express.

## GitHub Pages contract

A project should build one deployable Pages tree:

```
Vite application/presentation output
+ certified showcase media
+ required manifests/schemas/downloads
= one dist/
```

Upload that single tree with the GitHub Pages artifact action. Presentation and showcase workflows must not race to overwrite separate subsets of the deployed site.

For project Pages hosted below `/<repo>/`, use a correct Vite base or relative asset strategy and certify nested routes.

## Release artifact

Lūm currently publishes the transitional kit alongside its embed SDK. The project-site archive contains:

- `xtreemze-project-site.js`
- `xtreemze-project-site.d.ts`
- `project-site.css`
- `README.md`
- `SHA256SUMS`

This hosting location is temporary ownership, not a Lūm domain dependency. The public custom-element/event/property contract is intentionally independent of Lūm application modules so the files can move to a dedicated repository later.

## Native-first checklist

Before adding a dependency, prefer:

- semantic landmarks and native controls;
- CSS grid, flexbox, container queries and logical properties;
- `<dialog>` / popover where their semantics fit;
- Pointer Events and pointer capture;
- View Transitions for spatial continuity;
- Web Animations API for cancellable imperative motion;
- native media elements and Media Session for simple playback projections;
- browser sharing, fullscreen and clipboard APIs when available.

A reusable component should exist only when at least two concrete consumers need the same behavior and the boundary does not create a second state authority.
