(() => {
  "use strict";

  const DEFAULT_INTERVAL_MS = 10_000;
  const MIN_INTERVAL_MS = 2_000;
  const MAX_INTERVAL_MS = 3_600_000;
  const AXIS_THRESHOLD = 0.68;

  function clampInterval(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_INTERVAL_MS;
    return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, Math.round(numeric)));
  }

  function isEditableTarget(target) {
    return target instanceof Element && Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
    );
  }

  function commandFromKeyboard(event, activeNavigation) {
    if (!event || isEditableTarget(event.target)) return null;
    const key = event.key;
    if (["MediaPlayPause", "Play", "Pause"].includes(key)) return "toggle-auto";
    if (key === "MediaPlay") return "resume-auto";
    if (key === "MediaPause" || key === "MediaStop") return "pause-auto";
    if (["MediaTrackNext", "ChannelUp"].includes(key)) return "next";
    if (["MediaTrackPrevious", "ChannelDown"].includes(key)) return "previous";
    if (["BrowserBack", "Escape"].includes(key)) return "back";
    if (!activeNavigation) return null;
    if (key === "ArrowLeft") return "previous";
    if (key === "ArrowRight") return "next";
    if (key === "ArrowUp") return "previous-media";
    if (key === "ArrowDown") return "next-media";
    if (["Enter", "Accept", "Select"].includes(key)) return "activate";
    if (key === " ") return "toggle-auto";
    return null;
  }

  function gamepadControls(gamepad) {
    if (!gamepad || gamepad.connected === false) return new Map();
    const buttons = gamepad.buttons || [];
    const axes = gamepad.axes || [];
    const active = new Map();
    const pressed = (index) => Boolean(buttons[index]?.pressed || buttons[index]?.value > 0.6);
    if (pressed(0)) active.set("button-0", "activate");
    if (pressed(1)) active.set("button-1", "back");
    if (pressed(4)) active.set("button-4", "previous");
    if (pressed(5)) active.set("button-5", "next");
    if (pressed(9)) active.set("button-9", "toggle-auto");
    if (pressed(12)) active.set("button-12", "previous-media");
    if (pressed(13)) active.set("button-13", "next-media");
    if (pressed(14)) active.set("button-14", "previous");
    if (pressed(15)) active.set("button-15", "next");

    const x = Number(axes[0]) || 0;
    const y = Number(axes[1]) || 0;
    if (x <= -AXIS_THRESHOLD) active.set("axis-left", "previous");
    if (x >= AXIS_THRESHOLD) active.set("axis-right", "next");
    if (y <= -AXIS_THRESHOLD) active.set("axis-up", "previous-media");
    if (y >= AXIS_THRESHOLD) active.set("axis-down", "next-media");
    return active;
  }

  class AutoAdvanceController {
    constructor(options) {
      this.advance = options.advance;
      this.onStateChange = options.onStateChange || (() => {});
      this.intervalMs = clampInterval(options.intervalMs || DEFAULT_INTERVAL_MS);
      this.running = false;
      this.paused = false;
      this.pauseReason = "";
      this.timer = 0;
      this.deadline = 0;
      this.emit();
    }

    state() {
      return {
        running: this.running,
        paused: this.paused,
        intervalMs: this.intervalMs,
        pauseReason: this.pauseReason,
        deadline: this.deadline
      };
    }

    emit() {
      this.onStateChange(this.state());
    }

    setIntervalMs(value) {
      this.intervalMs = clampInterval(value);
      if (this.running && !this.paused) this.schedule();
      else this.emit();
    }

    start() {
      this.running = true;
      this.paused = false;
      this.pauseReason = "";
      this.schedule();
    }

    resume() {
      if (!this.running) {
        this.start();
        return;
      }
      this.paused = false;
      this.pauseReason = "";
      this.schedule();
    }

    pause(reason = "manual") {
      if (!this.running || this.paused) return;
      this.paused = true;
      this.pauseReason = reason;
      this.clearTimer();
      this.emit();
    }

    stop() {
      this.running = false;
      this.paused = false;
      this.pauseReason = "";
      this.clearTimer();
      this.emit();
    }

    toggle() {
      if (!this.running) this.start();
      else if (this.paused) this.resume();
      else this.pause("manual");
    }

    noteInteraction() {
      if (this.running && !this.paused) this.pause("interaction");
    }

    clearTimer() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = 0;
      this.deadline = 0;
    }

    schedule() {
      this.clearTimer();
      if (!this.running || this.paused) {
        this.emit();
        return;
      }
      this.deadline = Date.now() + this.intervalMs;
      this.timer = setTimeout(() => {
        this.timer = 0;
        this.deadline = 0;
        const advanced = this.advance?.() !== false;
        if (!advanced) {
          this.stop();
          return;
        }
        this.schedule();
      }, this.intervalMs);
      this.emit();
    }
  }

  class NavigationController {
    constructor(options) {
      this.root = options.root;
      this.isNavigationActive = options.isNavigationActive || (() => false);
      this.onCommand = options.onCommand || (() => {});
      this.auto = options.auto;
      this.pressedGamepadControls = new Set();
      this.frame = 0;
      this.bind();
      this.startGamepadPolling();
    }

    bind() {
      document.addEventListener("keydown", (event) => {
        const command = commandFromKeyboard(event, this.isNavigationActive());
        if (!command) return;
        if (command !== "toggle-auto" && command !== "resume-auto" && command !== "pause-auto") {
          this.auto?.noteInteraction();
        }
        if (this.onCommand(command, { source: "keyboard", event }) !== false) {
          event.preventDefault();
        }
      }, true);

      for (const type of ["pointerdown", "wheel"]) {
        this.root.addEventListener(type, (event) => {
          if (event.target.closest?.("[data-auto-control]")) return;
          this.auto?.noteInteraction();
        }, { capture: true, passive: true });
      }

      window.addEventListener("gamepadconnected", () => this.startGamepadPolling());
    }

    startGamepadPolling() {
      if (this.frame || !navigator.getGamepads) return;
      const poll = () => {
        this.frame = requestAnimationFrame(poll);
        const nextPressed = new Set();
        for (const gamepad of navigator.getGamepads()) {
          if (!gamepad) continue;
          const controls = gamepadControls(gamepad);
          for (const [control, command] of controls) {
            const key = `${gamepad.index}:${control}`;
            nextPressed.add(key);
            if (!this.pressedGamepadControls.has(key)) {
              if (command !== "toggle-auto") this.auto?.noteInteraction();
              this.onCommand(command, { source: "gamepad", gamepad });
            }
          }
        }
        this.pressedGamepadControls = nextPressed;
      };
      this.frame = requestAnimationFrame(poll);
    }
  }

  function create(options) {
    const auto = new AutoAdvanceController(options.auto || {});
    const navigation = new NavigationController({ ...options, auto });
    return Object.freeze({ auto, navigation });
  }

  globalThis.TimelineNavigation = Object.freeze({
    DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
    clampInterval,
    commandFromKeyboard,
    gamepadControls,
    create
  });
})();
