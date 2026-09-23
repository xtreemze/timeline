/**
 * Timeline motion and interaction physics
 * Inertia, velocity estimation, haptic feedback, pointer event handling
 */

const INERTIA_TAU_MS = 420;
const PAN_RESPONSE_MS = 78;
const STOP_VELOCITY_PX_PER_MS = 0.012;
const MAX_RELEASE_VELOCITY_PX_PER_MS = 3.2;
const MAX_RELEASE_SPEED_PX_PER_S = MAX_RELEASE_VELOCITY_PX_PER_MS * 1000;
const CAMERA_INERTIA_DECELERATION_PX_PER_S2 = Math.round(
  MAX_RELEASE_SPEED_PX_PER_S / (2 * (INERTIA_TAU_MS / 1000)),
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function responseForElapsed(
  elapsedMs: unknown,
  responseMs: number = PAN_RESPONSE_MS,
): number {
  const elapsed = clamp(Number(elapsedMs) || 0, 0, 64);
  const response = Math.max(1, Number(responseMs) || PAN_RESPONSE_MS);
  return 1 - Math.exp(-elapsed / response);
}

export function decayVelocity(
  velocity: unknown,
  elapsedMs: unknown,
  tauMs: number = INERTIA_TAU_MS,
): number {
  const tau = Math.max(1, Number(tauMs) || INERTIA_TAU_MS);
  return Number(velocity) * Math.exp(-Math.max(0, Number(elapsedMs) || 0) / tau);
}

function coalescedPointerEvents(event: PointerEvent | null): PointerEvent[] {
  if (event && typeof event.getCoalescedEvents === "function") {
    const events = event.getCoalescedEvents();
    if (Array.isArray(events) && events.length) return events;
  }
  return event ? [event] : [];
}

function coordinateForEvent(event: PointerEvent, orientation: string): number {
  return orientation === "vertical" ? event.clientY : event.clientX;
}

interface PointerSample {
  coordinate: number;
  time: number;
}

function isPointerSample(value: unknown): value is PointerSample {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Number.isFinite(record.coordinate) && Number.isFinite(record.time);
}

export function estimatePointerVelocity(samples: unknown, windowMs = 90): number {
  const source = Array.isArray(samples) ? samples.filter(isPointerSample) : [];
  if (source.length < 2) return 0;

  const last = source.at(-1);
  let first = source[0];
  if (!(last && first)) return 0;
  const minimumTime = last.time - Math.max(16, Number(windowMs) || 90);
  for (let index = source.length - 2; index >= 0; index -= 1) {
    const candidate = source[index];
    if (!candidate) continue;
    if (candidate.time < minimumTime) break;
    first = candidate;
  }

  const elapsed = Math.max(1, last.time - first.time);
  return clamp(
    (last.coordinate - first.coordinate) / elapsed,
    -MAX_RELEASE_VELOCITY_PX_PER_MS,
    MAX_RELEASE_VELOCITY_PX_PER_MS,
  );
}

export function appendPointerSamples(
  samples: unknown,
  event: PointerEvent | null,
  orientation: string,
  maxSamples = 24,
): PointerSample[] {
  const target = Array.isArray(samples) ? (samples as PointerSample[]) : [];
  for (const pointerEvent of coalescedPointerEvents(event)) {
    target.push({
      coordinate: coordinateForEvent(pointerEvent, orientation),
      time: Number(pointerEvent.timeStamp) || performance.now(),
    });
  }
  if (target.length > maxSamples) target.splice(0, target.length - maxSamples);
  return target;
}

interface VectorSample {
  x: number;
  y: number;
  time: number;
}

function isVectorSample(value: unknown): value is VectorSample {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Number.isFinite(record.x) && Number.isFinite(record.y) && Number.isFinite(record.time);
}

export function appendPointerVectorSamples(
  samples: unknown,
  event: PointerEvent | null,
  maxSamples = 24,
): VectorSample[] {
  const target = Array.isArray(samples) ? (samples as VectorSample[]) : [];
  for (const pointerEvent of coalescedPointerEvents(event)) {
    const x = Number(pointerEvent.clientX);
    const y = Number(pointerEvent.clientY);
    if (!(Number.isFinite(x) && Number.isFinite(y))) continue;
    target.push({
      x,
      y,
      time: Number(pointerEvent.timeStamp) || performance.now(),
    });
  }
  if (target.length > maxSamples) target.splice(0, target.length - maxSamples);
  return target;
}

interface Velocity {
  x: number;
  y: number;
  magnitude: number;
}

export function estimatePointerVectorVelocity(samples: unknown, windowMs = 90): Velocity {
  const source = Array.isArray(samples) ? samples.filter(isVectorSample) : [];
  if (source.length < 2) return { x: 0, y: 0, magnitude: 0 };

  const last = source.at(-1);
  let first = source[0];
  if (!(last && first)) return { x: 0, y: 0, magnitude: 0 };
  const minimumTime = last.time - Math.max(16, Number(windowMs) || 90);
  for (let index = source.length - 2; index >= 0; index -= 1) {
    const candidate = source[index];
    if (!candidate) continue;
    if (candidate.time < minimumTime) break;
    first = candidate;
  }

  const elapsed = Math.max(1, last.time - first.time);
  let x = (last.x - first.x) / elapsed;
  let y = (last.y - first.y) / elapsed;
  let magnitude = Math.hypot(x, y);
  if (magnitude > MAX_RELEASE_VELOCITY_PX_PER_MS) {
    const scale = MAX_RELEASE_VELOCITY_PX_PER_MS / magnitude;
    x *= scale;
    y *= scale;
    magnitude = MAX_RELEASE_VELOCITY_PX_PER_MS;
  }
  return { x, y, magnitude };
}

interface HapticActuator {
  playEffect?: (
    effect: string,
    params: {
      startDelay: number;
      duration: number;
      weakMagnitude: number;
      strongMagnitude: number;
    },
  ) => unknown;
  pulse?: (magnitude: number, duration: number) => unknown;
}

type HapticGamepad = Gamepad & {
  vibrationActuator?: HapticActuator;
  hapticActuators?: HapticActuator[];
};

async function gamepadPulse(duration: number, magnitude: number): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return false;
  const gamepads = Array.from(navigator.getGamepads?.() || []).filter(
    (gamepad): gamepad is Gamepad => Boolean(gamepad),
  );
  for (const gamepad of gamepads) {
    const hapticGamepad = gamepad as HapticGamepad;
    const actuator = hapticGamepad.vibrationActuator || hapticGamepad.hapticActuators?.[0];
    if (!actuator) continue;
    try {
      if (typeof actuator.playEffect === "function") {
        await actuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration,
          weakMagnitude: magnitude,
          strongMagnitude: Math.min(1, magnitude * 0.55),
        });
        return true;
      }
      if (typeof actuator.pulse === "function") {
        await actuator.pulse(magnitude, duration);
        return true;
      }
    } catch {
      // Haptics are opportunistic; unsupported effects must not interrupt interaction.
    }
  }
  return false;
}

interface HapticPattern {
  duration: number;
  magnitude: number;
  vibration: number;
}

function hapticPattern(kind: string): HapticPattern {
  if (kind === "cluster") return { duration: 14, magnitude: 0.18, vibration: 8 };
  if (kind === "release") return { duration: 22, magnitude: 0.24, vibration: 10 };
  if (kind === "selection") return { duration: 18, magnitude: 0.2, vibration: 7 };
  return { duration: 12, magnitude: 0.14, vibration: 6 };
}

export async function pulseHaptic(kind = "tick"): Promise<boolean> {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  const pattern = hapticPattern(kind);
  if (await gamepadPulse(pattern.duration, pattern.magnitude)) return true;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      return Boolean(navigator.vibrate(pattern.vibration));
    } catch {
      return false;
    }
  }
  return false;
}

// Export public API as frozen object for backward compatibility
const TimelineMotionObj = {
  INERTIA_TAU_MS,
  PAN_RESPONSE_MS,
  STOP_VELOCITY_PX_PER_MS,
  MAX_RELEASE_VELOCITY_PX_PER_MS,
  MAX_RELEASE_SPEED_PX_PER_S,
  CAMERA_INERTIA_DECELERATION_PX_PER_S2,
  appendPointerSamples,
  appendPointerVectorSamples,
  decayVelocity,
  estimatePointerVelocity,
  estimatePointerVectorVelocity,
  pulseHaptic,
  responseForElapsed,
} as const;

export const TimelineMotion = Object.freeze(TimelineMotionObj);
