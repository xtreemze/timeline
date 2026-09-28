const MCP_B_VERSION = "5.1.0";
const MCP_B_RUNTIME_URL =
  `https://cdn.jsdelivr.net/npm/@mcp-b/global@${MCP_B_VERSION}/dist/index.iife.js`;
const MCP_B_RELAY_URL =
  `https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@${MCP_B_VERSION}/dist/browser/embed.js`;

export type McpRelayConnectOptions = {
  port?: number;
  requestTimeoutMs?: number;
};

export type McpRelayStatus = {
  runtimeReady: boolean;
  relayLoaded: boolean;
  version: string;
  runtimeUrl: string;
  relayUrl: string;
};

type RelayRoot = {
  document?: Document;
};

function modelContext(document: Document): Record<string, unknown> | null {
  const value = Reflect.get(document, "modelContext");
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function hasWebMcpRuntime(document: Document): boolean {
  return typeof modelContext(document)?.registerTool === "function";
}

function positiveInteger(value: unknown, label: string, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw new Error(`${label} must be an integer between 1 and ${max}.`);
  }
  return number;
}

function scriptSelector(kind: string): string {
  return `script[data-lum-mcp="${kind}"]`;
}

function loadScript(
  document: Document,
  kind: string,
  src: string,
  dataset: Record<string, string> = {},
): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(scriptSelector(kind));
  if (existing?.dataset.lumMcpLoaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement("script");
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      script.dataset.lumMcpLoaded = "true";
      resolve();
    };
    const onError = () => {
      cleanup();
      if (!existing) script.remove();
      reject(new Error(`Could not load Lūm MCP bridge dependency: ${src}`));
    };

    for (const [key, value] of Object.entries(dataset)) {
      script.dataset[key] = value;
    }
    script.dataset.lumMcp = kind;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) {
      script.src = src;
      script.async = true;
      (document.head || document.documentElement).append(script);
    }
  });
}

export function createMcpRelayBridge(root: RelayRoot = globalThis): Readonly<{
  version: string;
  prepare: () => Promise<McpRelayStatus>;
  connect: (options?: McpRelayConnectOptions) => Promise<McpRelayStatus>;
  status: () => McpRelayStatus;
}> {
  let runtimePromise: Promise<void> | null = null;
  let relayPromise: Promise<void> | null = null;

  const document = () => {
    if (!root.document) throw new Error("The Lūm MCP relay requires a browser document.");
    return root.document;
  };

  const status = (): McpRelayStatus => {
    const current = root.document;
    return {
      runtimeReady: Boolean(current && hasWebMcpRuntime(current)),
      relayLoaded: Boolean(
        current?.querySelector<HTMLScriptElement>(scriptSelector("relay"))?.dataset
          .lumMcpLoaded === "true",
      ),
      version: MCP_B_VERSION,
      runtimeUrl: MCP_B_RUNTIME_URL,
      relayUrl: MCP_B_RELAY_URL,
    };
  };

  const prepare = async (): Promise<McpRelayStatus> => {
    const current = document();
    if (hasWebMcpRuntime(current)) return status();
    runtimePromise ||= loadScript(current, "runtime", MCP_B_RUNTIME_URL);
    try {
      await runtimePromise;
    } catch (error) {
      runtimePromise = null;
      throw error;
    }
    if (!hasWebMcpRuntime(current)) {
      runtimePromise = null;
      throw new Error("MCP-B loaded, but document.modelContext is still unavailable.");
    }
    return status();
  };

  const connect = async (options: McpRelayConnectOptions = {}): Promise<McpRelayStatus> => {
    const current = document();
    await prepare();

    const port = positiveInteger(options.port, "MCP relay port", 65535);
    const requestTimeoutMs = positiveInteger(
      options.requestTimeoutMs,
      "MCP request timeout",
      600_000,
    );
    const dataset: Record<string, string> = {};
    if (port) dataset.relayPort = String(port);
    if (requestTimeoutMs) dataset.requestTimeout = String(requestTimeoutMs);

    relayPromise ||= loadScript(current, "relay", MCP_B_RELAY_URL, dataset);
    try {
      await relayPromise;
    } catch (error) {
      relayPromise = null;
      throw error;
    }
    return status();
  };

  return Object.freeze({
    version: MCP_B_VERSION,
    prepare,
    connect,
    status,
  });
}

export const TimelineMCPRelay = Object.freeze({
  version: MCP_B_VERSION,
  runtimeUrl: MCP_B_RUNTIME_URL,
  relayUrl: MCP_B_RELAY_URL,
  create: createMcpRelayBridge,
});
