(() => {
  "use strict";

  const INERTIA_TAU_MS = 420;
  const PAN_RESPONSE_MS = 78;
  const STOP_VELOCITY_PX_PER_MS = 0.012;
  const MAX_RELEASE_VELOCITY_PX_PER_MS = 3.2;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function responseForElapsed(elapsedMs, responseMs = PAN_RESPONSE_MS) {
    const elapsed = clamp(Number(elapsedMs) || 0, 0, 64);
    const response = Math.max(1, Number(responseMs) || PAN_RESPONSE_MS);
    return 1 - Math.exp(-elapsed / response);
  }

  function decayVelocity(velocity, elapsedMs, tauMs = INERTIA_TAU_MS) {
    const tau = Math.max(1, Number(tauMs) || INERTIA_TAU_MS);
    return Number(velocity) * Math.exp(-(Math.max(0, Number(elapsedMs) || 0)) / tau);
  }

  function coalescedPointerEvents(event) {
    if (event && typeof event.getCoalescedEvents === "function") {
      const events = event.getCoalescedEvents();
      if (Array.isArray(events) && events.length) return events;
    }
    return event ? [event] : [];
  }

  function coordinateForEvent(event, orientation) {
    return orientation === "vertical" ? event.clientY : event.clientX;
  }

  function estimatePointerVelocity(samples, windowMs = 90) {
    const source = Array.isArray(samples)
      ? samples.filter((sample) => sample && Number.isFinite(sample.coordinate) && Number.isFinite(sample.time))
      : [];
    if (source.length < 2) return 0;

    const last = source[source.length - 1];
    const minimumTime = last.time - Math.max(16, Number(windowMs) || 90);
    let first = source[0];
    for (let index = source.length - 2; index >= 0; index -= 1) {
      if (source[index].time < minimumTime) break;
      first = source[index];
    }

    const elapsed = Math.max(1, last.time - first.time);
    return clamp(
      (last.coordinate - first.coordinate) / elapsed,
      -MAX_RELEASE_VELOCITY_PX_PER_MS,
      MAX_RELEASE_VELOCITY_PX_PER_MS
    );
  }

  function appendPointerSamples(samples, event, orientation, maxSamples = 24) {
    const target = Array.isArray(samples) ? samples : [];
    for (const pointerEvent of coalescedPointerEvents(event)) {
      target.push({
        coordinate: coordinateForEvent(pointerEvent, orientation),
        time: Number(pointerEvent.timeStamp) || performance.now()
      });
    }
    if (target.length > maxSamples) target.splice(0, target.length - maxSamples);
    return target;
  }

  async function gamepadPulse(duration, magnitude) {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return false;
    const gamepads = Array.from(navigator.getGamepads() || []).filter(Boolean);
    for (const gamepad of gamepads) {
      const actuator = gamepad.vibrationActuator || gamepad.hapticActuators?.[0];
      if (!actuator) continue;
      try {
        if (typeof actuator.playEffect === "function") {
          await actuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration,
            weakMagnitude: magnitude,
            strongMagnitude: Math.min(1, magnitude * 0.55)
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

  function hapticPattern(kind) {
    if (kind === "cluster") return { duration: 14, magnitude: 0.18, vibration: 8 };
    if (kind === "release") return { duration: 22, magnitude: 0.24, vibration: 10 };
    if (kind === "selection") return { duration: 18, magnitude: 0.2, vibration: 7 };
    return { duration: 12, magnitude: 0.14, vibration: 6 };
  }

  async function pulseHaptic(kind = "tick") {
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

  globalThis.TimelineMotion = Object.freeze({
    INERTIA_TAU_MS,
    PAN_RESPONSE_MS,
    STOP_VELOCITY_PX_PER_MS,
    appendPointerSamples,
    decayVelocity,
    estimatePointerVelocity,
    pulseHaptic,
    responseForElapsed
  });
})();
