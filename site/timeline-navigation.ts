/**
 * Timeline navigation and auto-advance controls
 * Keyboard/gamepad input handling, auto-play state management
 */

const DEFAULT_INTERVAL_MS = 10_000;
const MIN_INTERVAL_MS = 2_000;
const MAX_INTERVAL_MS = 3_600_000;
const AXIS_THRESHOLD = 0.68;

function isEditableTarget(target: unknown): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"),
    )
  );
}

export function commandFromKeyboard(event: unknown, activeNavigation: boolean): string | null {
  if (!event || isEditableTarget((event as any)?.target)) return null;
  const key = (event as any)?.key;
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

export function gamepadControls(gamepad: Gamepad | null): Map<string, string> {
  if (!gamepad || gamepad.connected === false) return new Map();
  const buttons = gamepad.buttons || [];
  const axes = gamepad.axes || [];
  const active = new Map<string, string>();
  const pressed = (index: number) =>
    Boolean(buttons[index]?.pressed || (buttons[index]?.value ?? 0) > 0.6);
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

export function clampInterval(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_INTERVAL_MS;
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, Math.round(numeric)));
}

interface AutoAdvanceState {
  running: boolean;
  paused: boolean;
  intervalMs: number;
  pauseReason: string;
  deadline: number;
}

interface AutoAdvanceOptions {
  advance?: () => boolean | void;
  onStateChange?: (state: AutoAdvanceState) => void;
  intervalMs?: number;
}

class AutoAdvanceController {
  advance?: () => boolean | void;
  onStateChange: (state: AutoAdvanceState) => void;
  intervalMs: number;
  running: boolean;
  paused: boolean;
  pauseReason: string;
  timer: number;
  deadline: number;

  constructor(options: AutoAdvanceOptions) {
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

  state(): AutoAdvanceState {
    return {
      running: this.running,
      paused: this.paused,
      intervalMs: this.intervalMs,
      pauseReason: this.pauseReason,
      deadline: this.deadline,
    };
  }

  emit(): void {
    this.onStateChange(this.state());
  }

  setIntervalMs(value: unknown): void {
    this.intervalMs = clampInterval(value);
    if (this.running && !this.paused) this.schedule();
    else this.emit();
  }

  start(): void {
    this.running = true;
    this.paused = false;
    this.pauseReason = "";
    this.schedule();
  }

  resume(): void {
    if (!this.running) {
      this.start();
      return;
    }
    this.paused = false;
    this.pauseReason = "";
    this.schedule();
  }

  pause(reason: string = "manual"): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pauseReason = reason;
    this.clearTimer();
    this.emit();
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.pauseReason = "";
    this.clearTimer();
    this.emit();
  }

  toggle(): void {
    if (!this.running) this.start();
    else if (this.paused) this.resume();
    else this.pause("manual");
  }

  noteInteraction(): void {
    if (this.running && !this.paused) this.pause("interaction");
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = 0;
    this.deadline = 0;
  }

  private schedule(): void {
    this.clearTimer();
    if (!this.running || this.paused) {
      this.emit();
      return;
    }
    this.deadline = Date.now() + this.intervalMs;
    this.timer = window.setTimeout(() => {
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

interface NavigationOptions {
  root: Element;
  isNavigationActive?: () => boolean;
  onCommand?: (command: string, context: any) => boolean | void;
  auto?: AutoAdvanceController;
}

class NavigationController {
  root: Element;
  isNavigationActive: () => boolean;
  onCommand: (command: string, context: any) => boolean | void;
  auto?: AutoAdvanceController;
  pressedGamepadControls: Set<string>;
  frame: number;

  constructor(options: NavigationOptions) {
    this.root = options.root;
    this.isNavigationActive = options.isNavigationActive || (() => false);
    this.onCommand = options.onCommand || (() => {});
    this.auto = options.auto;
    this.pressedGamepadControls = new Set();
    this.frame = 0;
    this.bind();
    if (navigator.getGamepads?.().some(Boolean)) this.startGamepadPolling();
  }

  private bind(): void {
    document.addEventListener(
      "keydown",
      (event) => {
        const command = commandFromKeyboard(event, this.isNavigationActive());
        if (!command) {
          if (
            !isEditableTarget(event.target) &&
            !(event.target as any).closest?.("[data-auto-control]")
          ) {
            this.auto?.noteInteraction();
          }
          return;
        }
        const autoCommand =
          command === "toggle-auto" || command === "resume-auto" || command === "pause-auto";
        const activatesAutoControl =
          command === "activate" && (event.target as any).closest?.("[data-auto-control]");
        if (!autoCommand && !activatesAutoControl) this.auto?.noteInteraction();
        if (this.onCommand(command, { source: "keyboard", event }) !== false) {
          event.preventDefault();
        }
      },
      true,
    );

    for (const type of ["pointerdown", "wheel"]) {
      this.root.addEventListener(
        type,
        (event: any) => {
          if (event.target.closest?.("[data-auto-control]")) return;
          this.auto?.noteInteraction();
        },
        { capture: true, passive: true },
      );
    }

    window.addEventListener("gamepadconnected", () => this.startGamepadPolling());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.auto?.pause("hidden");
    });
  }

  private startGamepadPolling(): void {
    if (this.frame || !navigator.getGamepads) return;
    const poll = () => {
      const gamepads = [...(navigator.getGamepads?.() || [])].filter(Boolean) as Gamepad[];
      if (!gamepads.length) {
        this.frame = 0;
        this.pressedGamepadControls.clear();
        return;
      }
      const nextPressed = new Set<string>();
      for (const gamepad of gamepads) {
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
      this.frame = requestAnimationFrame(poll);
    };
    this.frame = requestAnimationFrame(poll);
  }
}

interface NavigationControllerOptions {
  root: Element;
  isNavigationActive?: () => boolean;
  onCommand?: (command: string, context: any) => boolean | void;
  auto?: AutoAdvanceOptions;
}

export function create(options: NavigationControllerOptions): {
  auto: AutoAdvanceController;
  navigation: NavigationController;
} {
  const auto = new AutoAdvanceController(options.auto || {});
  const navigation = new NavigationController({ ...options, auto });
  return Object.freeze({ auto, navigation });
}

// Export public API as frozen object for backward compatibility
const TimelineNavigationObj = {
  DEFAULT_INTERVAL_MS,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  clampInterval,
  commandFromKeyboard,
  gamepadControls,
  create,
} as const;

export const TimelineNavigation = Object.freeze(TimelineNavigationObj);
