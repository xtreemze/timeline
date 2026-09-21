import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("graph auto-fit yields to explicit user camera ownership", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /let userOwnsCamera = false;/);
  assert.match(source, /let pendingAutoFit = false;/);
  assert.match(
    source,
    /function markCameraOwnedByUser\(\)[\s\S]*userOwnsCamera = true;[\s\S]*pendingAutoFit = false;/,
  );
  assert.match(
    source,
    /function requestAutoFit\(\)[\s\S]*if \(!userOwnsCamera\) pendingAutoFit = true;/,
  );
  assert.match(
    source,
    /function applyPendingAutoFit\(\)[\s\S]*if \(userOwnsCamera \|\| !pendingAutoFit\) return false;[\s\S]*orb\.recenter\(\)/,
  );

  assert.match(
    source,
    /finishCameraGesture\(event\)[\s\S]*gesture\.moved[\s\S]*markCameraOwnedByUser\(\)/,
  );
  assert.match(
    source,
    /const onWheelCapture = \(\) => \{[\s\S]*markCameraOwnedByUser\(\)[\s\S]*cancelCameraInertia\(\)/,
  );
  assert.match(source, /activeTouchPointers\.size > 1[\s\S]*markCameraOwnedByUser\(\)/);
  assert.match(source, /case "\+":[\s\S]*markCameraOwnedByUser\(\)[\s\S]*orb\.zoomIn\(\)/);
  assert.match(source, /case "Home":[\s\S]*releaseCameraToAutoFit\(\)[\s\S]*orb\.recenter\(\)/);

  assert.match(
    source,
    /const topologyChanged = Boolean\([\s\S]*incomingNodes\.length[\s\S]*rewiredEdges\.length[\s\S]*if \(topologyChanged\) requestAutoFit\(\)/,
  );
  assert.match(
    source,
    /const onSimulationEnd[\s\S]*requestAutoFit\(\)[\s\S]*applyPendingAutoFit\(\)/,
  );
  assert.match(
    source,
    /refreshLayout\(\)[\s\S]*orb\.render\(\(\) => \{[\s\S]*if \(!userOwnsCamera\) orb\.recenter\(\)/,
  );
  assert.match(source, /recenter\(\)[\s\S]*releaseCameraToAutoFit\(\)[\s\S]*orb\.recenter\(\)/);
});
