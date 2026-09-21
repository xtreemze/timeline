import js from "@eslint/js";

export default [
  // Ignore bundled and lock files
  {
    ignores: ["site/orb-graph.bundle.js", "pnpm-lock.yaml", "node_modules/**"],
  },
  {
    files: ["src/**/*.js", "site/**/*.js", "tests/**/*.mjs", "benchmarks/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        // Browser globals
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        WebSocket: "readonly",
        Worker: "readonly",
        EventTarget: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        indexedDB: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        queueMicrotask: "readonly",
        Promise: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        MutationObserver: "readonly",
        PerformanceObserver: "readonly",
        CSS: "readonly",
        Element: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLAnchorElement: "readonly",
        DOMParser: "readonly",
        performance: "readonly",
        getComputedStyle: "readonly",
        structuredClone: "readonly",
        WheelEvent: "readonly",
        Temporal: "readonly",
        L: "readonly", // Leaflet library
        console: "readonly",
        // Node (for tests/benchmarks)
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Strict error checking
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "error",
      "no-undefined": "warn", // Allow undefined checks, but warn on suspicious uses
      "no-implicit-globals": "error",
      "no-implicit-coercion": "error",
      // Type safety (JSDoc checked by TypeScript)
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "warn", // Downgrade to warn for complex callbacks
      // Logic safety
      eqeqeq: ["error", "always"],
      "no-case-declarations": "error",
      "no-fallthrough": "error",
      "no-constant-condition": "error",
      "no-duplicate-case": "error",
      "no-empty": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-global-assign": "error",
      "no-with": "error",
      // Async/Promise safety
      "no-async-promise-executor": "error",
      "no-promise-executor-return": "error",
      // Array/Object safety
      "no-sparse-arrays": "error",
      "no-prototype-builtins": "error",
      // Best practices
      "no-param-reassign": "warn", // Downgrade to warn (common in event handlers)
      "no-return-await": "error",
      "require-await": "off", // Not all promises need await
      "no-unreachable": "error",
      "no-unreachable-loop": "error",
      "no-loss-of-precision": "error",
    },
  },
];
