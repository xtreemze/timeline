import { spawnSync } from "node:child_process";

import { validateLumChangeProposal } from "./lum-agent-proposal.mjs";

function cleanAdapterCommand(value) {
  const command = String(value ?? "").trim();
  if (!command) throw new Error("agent run requires an explicit --adapter executable.");
  if (command.includes("\\0")) throw new Error("Adapter executable contains an invalid null byte.");
  return command;
}

export function runLumAgentAdapter({
  command,
  args = [],
  context,
  projectSource,
  cwd = process.cwd(),
}) {
  const executable = cleanAdapterCommand(command);
  const adapterArgs = Array.isArray(args) ? args.map((value) => String(value)) : [];
  const input = `${JSON.stringify(context)}\n`;
  const result = spawnSync(executable, adapterArgs, {
    cwd,
    input,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`Agent adapter failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = String(result.stderr ?? "").trim();
    throw new Error(
      `Agent adapter exited with status ${result.status}${detail ? `: ${detail}` : "."}`,
    );
  }

  const proposalSource = String(result.stdout ?? "").trim();
  if (!proposalSource) throw new Error("Agent adapter returned no proposal output.");

  // Adapter output arrives on stdout, not as a named file, so the proposal suffix rule does not
  // apply; "-" is the stream marker the validator already exempts.
  const validation = validateLumChangeProposal(proposalSource, projectSource, { fileName: "-" });
  return Object.freeze({
    valid: validation.valid,
    diagnostics: validation.diagnostics,
    proposalSource: proposalSource.endsWith("\n") ? proposalSource : `${proposalSource}\n`,
    ...(validation.summary ? { summary: validation.summary } : {}),
    verificationRequired: true,
  });
}
