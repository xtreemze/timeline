// Timeline application globals
declare global {
  var Timeline: any;
  var TimelineScale: any;
  var TimelineTemporal: any;
  var TimelineSpatial: any;
  var TimelineGraph: any;
  var TimelinePresentation: any;
  var TimelineDateRangePicker: any;
  var TimelineNavigation: any;
  var TimelineEvidence: any;
  var TemporalGraphView: any;
  var TimelinePresentationLayout: any;
  var TimelineCaseReasoning: any;
  var TimelineMigration: any;
  var TimelineMemgraphInterchange: any;
  var TimelineWebMCP: any;
  var TimelineWebMCPRegistration: any;
  var TimelineSampleCase: any;
  var TimelineAgentAPI: any;
  var TimelineLocalLLM: ReturnType<
    typeof import("./site/local-llm-agent.ts").createLocalLlmAgent
  >;
  var TimelineMCPRelay: {
    readonly version: string;
    status(): import("./site/mcp-relay.ts").McpRelayStatus;
    connect(options?: import("./site/mcp-relay.ts").McpRelayConnectOptions): Promise<
      import("./site/mcp-relay.ts").McpRelayStatus & { toolNames: string[] }
    >;
  };
}

export {};
