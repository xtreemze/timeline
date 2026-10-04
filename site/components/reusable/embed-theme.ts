import { css } from "lit";

export const embedThemeStyles = css`
  :host {
    color: var(--luum-embed-ink, #211d14);
    font-family: var(
      --luum-embed-font,
      "Avenir Next",
      "Segoe UI",
      system-ui,
      sans-serif
    );
    --_luum-paper: var(--luum-embed-paper, #fff9e4);
    --_luum-panel: var(--luum-embed-panel, #f6df8f);
    --_luum-line: var(--luum-embed-line, #211d14);
    --_luum-muted: var(--luum-embed-muted, #655f50);
    --_luum-accent: var(--luum-embed-accent, #236f5e);
    --_luum-focus: var(--luum-embed-focus, #1d6d5d);
    --_luum-radius: var(--luum-embed-radius, 0px);
    --_luum-shadow: var(--luum-embed-shadow, 5px 5px 0 #211d14);
  }

  button {
    font: inherit;
  }

  button:focus-visible {
    outline: 3px solid var(--_luum-focus);
    outline-offset: 4px;
  }
`;
