(() => {
  "use strict";

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) return null;
    return { year, month, day, value: `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}` };
  }

  function compareDates(left, right) {
    return String(left).localeCompare(String(right));
  }

  function monthShift(year, month, delta) {
    const absolute = year * 12 + (month - 1) + delta;
    return {
      year: Math.floor(absolute / 12),
      month: ((absolute % 12) + 12) % 12 + 1
    };
  }

  function daysInMonth(year, month) {
    const date = new Date(0);
    date.setUTCFullYear(year, month, 1);
    date.setUTCMonth(month);
    date.setUTCDate(0);
    return date.getUTCDate();
  }

  function mondayIndex(year, month) {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, 1);
    date.setUTCHours(0, 0, 0, 0);
    return (date.getUTCDay() + 6) % 7;
  }

  function addDays(value, delta) {
    const parsed = parseDate(value);
    if (!parsed) return "";
    const date = new Date(0);
    date.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day + delta);
    date.setUTCHours(0, 0, 0, 0);
    const year = date.getUTCFullYear();
    if (year < 1 || year > 9999) return value;
    return `${String(year).padStart(4, "0")}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  function formatDisplay(start, end, mode) {
    const parsedStart = parseDate(start);
    if (!parsedStart) return "";
    const date = new Date(0);
    date.setUTCFullYear(parsedStart.year, parsedStart.month - 1, parsedStart.day);
    const format = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
    if (mode !== "range" || !end || end === start) return format.format(date);

    const parsedEnd = parseDate(end);
    if (!parsedEnd) return format.format(date);
    const endDate = new Date(0);
    endDate.setUTCFullYear(parsedEnd.year, parsedEnd.month - 1, parsedEnd.day);

    if (parsedStart.year === parsedEnd.year && parsedStart.month === parsedEnd.month) {
      const monthYear = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        timeZone: "UTC"
      }).format(date);
      return `${parsedStart.day}–${parsedEnd.day} ${monthYear}`;
    }
    return `${format.format(date)} – ${format.format(endDate)}`;
  }

  class DateRangePicker {
    constructor(options) {
      this.input = options.input;
      this.popover = options.popover;
      this.grid = options.grid;
      this.heading = options.heading;
      this.yearInput = options.yearInput;
      this.previousButton = options.previousButton;
      this.nextButton = options.nextButton;
      this.clearButton = options.clearButton;
      this.startInput = options.startInput;
      this.endInput = options.endInput;
      this.mode = options.mode === "range" ? "range" : "event";
      this.start = "";
      this.end = "";
      this.pendingStart = "";
      const today = new Date();
      this.viewYear = today.getFullYear();
      this.viewMonth = today.getMonth() + 1;
      this.bind();
      this.render();
    }

    bind() {
      this.input.addEventListener("click", () => this.open());
      this.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
          event.preventDefault();
          this.open();
        }
      });

      this.previousButton.addEventListener("click", () => this.shiftMonth(-1));
      this.nextButton.addEventListener("click", () => this.shiftMonth(1));
      this.clearButton.addEventListener("click", () => {
        this.clear();
        this.popover.hidePopover();
        this.input.focus();
      });
      this.yearInput.addEventListener("change", () => {
        const year = Math.max(1, Math.min(9999, Number(this.yearInput.value) || this.viewYear));
        this.viewYear = year;
        this.render();
      });

      this.grid.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-date]");
        if (!button) return;
        this.choose(button.dataset.date);
      });

      this.grid.addEventListener("keydown", (event) => {
        const button = event.target.closest("button[data-date]");
        if (!button) return;
        const keyDeltas = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -7,
          ArrowDown: 7
        };
        if (keyDeltas[event.key] !== undefined) {
          event.preventDefault();
          this.focusDate(addDays(button.dataset.date, keyDeltas[event.key]));
          return;
        }
        if (event.key === "PageUp" || event.key === "PageDown") {
          event.preventDefault();
          const direction = event.key === "PageUp" ? -1 : 1;
          const parsed = parseDate(button.dataset.date);
          if (!parsed) return;
          const shifted = monthShift(parsed.year, parsed.month, direction);
          const day = Math.min(parsed.day, daysInMonth(shifted.year, shifted.month));
          this.focusDate(`${String(shifted.year).padStart(4, "0")}-${pad(shifted.month)}-${pad(day)}`);
        }
      });

      this.popover.addEventListener("toggle", (event) => {
        if (event.newState === "open") {
          const selected = parseDate(this.pendingStart || this.start);
          if (selected) {
            this.viewYear = selected.year;
            this.viewMonth = selected.month;
          }
          this.render();
          requestAnimationFrame(() => {
            this.grid.querySelector('button[tabindex="0"]')?.focus();
          });
        }
      });
    }

    setMode(mode) {
      const next = mode === "range" ? "range" : "event";
      if (this.mode === next) return;
      this.mode = next;
      this.input.placeholder = next === "range" ? "Choose start and end dates" : "Choose a date";
      if (next === "event") {
        this.end = "";
        this.pendingStart = "";
        this.sync();
      }
      this.render();
    }

    open() {
      if (!this.popover.matches(":popover-open")) this.popover.showPopover({ source: this.input });
    }

    shiftMonth(delta) {
      const next = monthShift(this.viewYear, this.viewMonth, delta);
      this.viewYear = Math.max(1, Math.min(9999, next.year));
      this.viewMonth = next.month;
      this.render();
    }

    focusDate(value) {
      const parsed = parseDate(value);
      if (!parsed) return;
      this.viewYear = parsed.year;
      this.viewMonth = parsed.month;
      this.render();
      requestAnimationFrame(() => {
        this.grid.querySelector(`button[data-date="${CSS.escape(value)}"]`)?.focus();
      });
    }

    choose(value) {
      if (!parseDate(value)) return;

      if (this.mode === "event") {
        this.start = value;
        this.end = "";
        this.pendingStart = "";
        this.sync(true);
        this.popover.hidePopover();
        this.input.focus();
        return;
      }

      if (!this.pendingStart) {
        this.pendingStart = value;
        this.start = value;
        this.end = "";
        this.sync(true);
        this.render();
        return;
      }

      if (compareDates(value, this.pendingStart) < 0) {
        this.start = value;
        this.end = this.pendingStart;
      } else {
        this.start = this.pendingStart;
        this.end = value;
      }
      this.pendingStart = "";
      this.sync(true);
      this.render();
      this.popover.hidePopover();
      this.input.focus();
    }

    setRange(start, end = "") {
      const parsedStart = parseDate(start);
      const parsedEnd = parseDate(end);
      this.start = parsedStart?.value || "";
      this.end = this.mode === "range" ? parsedEnd?.value || "" : "";
      this.pendingStart = "";
      if (parsedStart) {
        this.viewYear = parsedStart.year;
        this.viewMonth = parsedStart.month;
      }
      this.sync();
      this.render();
    }

    clear() {
      this.start = "";
      this.end = "";
      this.pendingStart = "";
      this.sync(true);
      this.render();
    }

    sync(dispatch = false) {
      this.startInput.value = this.start;
      this.endInput.value = this.mode === "range" ? this.end : "";
      this.input.value = formatDisplay(this.start, this.end, this.mode);
      this.input.setAttribute(
        "aria-label",
        this.input.value
          ? `${this.mode === "range" ? "Date range" : "Date"}: ${this.input.value}`
          : this.mode === "range" ? "Choose date range" : "Choose date"
      );
      if (dispatch) {
        this.startInput.dispatchEvent(new Event("change", { bubbles: true }));
        this.endInput.dispatchEvent(new Event("change", { bubbles: true }));
        this.input.dispatchEvent(new CustomEvent("daterangechange", {
          bubbles: true,
          detail: { start: this.start, end: this.end, mode: this.mode }
        }));
      }
    }

    render() {
      this.heading.textContent = MONTHS[this.viewMonth - 1];
      this.yearInput.value = String(this.viewYear);
      this.grid.replaceChildren();

      for (const weekday of WEEKDAYS) {
        const label = document.createElement("span");
        label.className = "range-calendar-weekday";
        label.textContent = weekday;
        this.grid.append(label);
      }

      const leading = mondayIndex(this.viewYear, this.viewMonth);
      const previous = monthShift(this.viewYear, this.viewMonth, -1);
      const previousDays = daysInMonth(previous.year, previous.month);
      const currentDays = daysInMonth(this.viewYear, this.viewMonth);

      const totalCells = 42;
      for (let index = 0; index < totalCells; index += 1) {
        let year = this.viewYear;
        let month = this.viewMonth;
        let day = index - leading + 1;
        let outside = false;

        if (day < 1) {
          year = previous.year;
          month = previous.month;
          day = previousDays + day;
          outside = true;
        } else if (day > currentDays) {
          const next = monthShift(this.viewYear, this.viewMonth, 1);
          year = next.year;
          month = next.month;
          day -= currentDays;
          outside = true;
        }

        const value = `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "range-calendar-day";
        button.dataset.date = value;
        button.textContent = String(day);
        button.tabIndex = -1;
        button.classList.toggle("is-outside", outside);

        const start = this.pendingStart || this.start;
        const end = this.end;
        const isStart = value === start;
        const isEnd = value === end;
        const inRange = start && end && compareDates(value, start) >= 0 && compareDates(value, end) <= 0;
        button.classList.toggle("is-start", isStart);
        button.classList.toggle("is-end", isEnd);
        button.classList.toggle("is-in-range", Boolean(inRange));

        const parsed = parseDate(value);
        if (parsed) {
          const date = new Date(0);
          date.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
          button.setAttribute("aria-label", new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
            timeZone: "UTC"
          }).format(date));
        }

        this.grid.append(button);
      }

      const preferred =
        this.grid.querySelector(`button[data-date="${CSS.escape(this.pendingStart || this.start || "")}"]`) ||
        this.grid.querySelector("button:not(.is-outside)") ||
        this.grid.querySelector("button");
      if (preferred) preferred.tabIndex = 0;
    }
  }

  function create(options) {
    return new DateRangePicker(options);
  }

  globalThis.TimelineDateRangePicker = Object.freeze({
    create,
    formatDisplay,
    parseDate
  });
})();
