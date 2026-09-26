import assert from "node:assert/strict";
import test from "node:test";

class FakeElement {
  constructor({ navigation = false, tagName = "DIV" } = {}) {
    this.navigation = navigation;
    this.tagName = tagName;
  }

  closest(selector) {
    if (this.navigation && selector === "[data-surface-keyboard-navigation]") return this;
    return null;
  }
}
globalThis.Element = FakeElement;
await import("../site/timeline-navigation-shim.ts");

const navigation = globalThis.TimelineNavigation;

test("keyboard maps TV remote, media and focused D-pad keys to presentation commands", () => {
  const event = (key) => ({ key, target: new FakeElement() });
  assert.equal(navigation.commandFromKeyboard(event("BrowserBack"), false), "back");
  assert.equal(navigation.commandFromKeyboard(event("MediaPlayPause"), false), "toggle-auto");
  assert.equal(navigation.commandFromKeyboard(event("MediaTrackNext"), false), "next");
  assert.equal(navigation.commandFromKeyboard(event("ChannelDown"), false), "previous");
  assert.equal(navigation.commandFromKeyboard(event("ArrowRight"), true), "next");
  assert.equal(navigation.commandFromKeyboard(event("ArrowUp"), true), "previous-media");
  assert.equal(navigation.commandFromKeyboard(event("ArrowRight"), false), null);
});

test("presentation arrows yield to a focused world camera surface", () => {
  const target = new FakeElement({ navigation: true });
  assert.equal(
    navigation.commandFromKeyboard({ key: "ArrowRight", target }, true),
    null,
  );
  assert.equal(navigation.commandFromKeyboard({ key: "Enter", target }, true), null);
  assert.equal(
    navigation.commandFromKeyboard({ key: "MediaPlayPause", target }, true),
    "toggle-auto",
  );
  assert.equal(navigation.commandFromKeyboard({ key: "Escape", target }, true), "back");
});

test("presentation navigation leaves native control keys local", () => {
  const target = new FakeElement({ tagName: "BUTTON" });
  assert.equal(navigation.commandFromKeyboard({ key: "ArrowRight", target }, true), null);
  assert.equal(navigation.commandFromKeyboard({ key: "Enter", target }, true), null);
  assert.equal(navigation.commandFromKeyboard({ key: "Escape", target }, true), "back");
});

test("standard gamepad buttons and axes map to the same commands", () => {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  buttons[0] = { pressed: true, value: 1 };
  buttons[15] = { pressed: true, value: 1 };
  const commands = [
    ...navigation
      .gamepadControls({
        connected: true,
        buttons,
        axes: [-0.8, 0.9],
      })
      .values(),
  ];
  assert.ok(commands.includes("activate"));
  assert.ok(commands.includes("next"));
  assert.ok(commands.includes("previous"));
  assert.ok(commands.includes("next-media"));
});

test("auto advance intervals are bounded", () => {
  assert.equal(navigation.clampInterval(100), 2000);
  assert.equal(navigation.clampInterval(10_000), 10_000);
  assert.equal(navigation.clampInterval(9_000_000), 3_600_000);
});
