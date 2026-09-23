import { html, render as renderLit } from "lit";
import { repeat } from "lit/directives/repeat.js";

/**
 * Date range picker calendar UI component
 * Provides date selection and range mode support with keyboard navigation
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(value: number | string): string {
  return String(value).padStart(2, "0");
}

interface ParsedDate {
  year: number;
  month: number;
  day: number;
  value: string;
}

function parseDate(value: unknown): ParsedDate | null {
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
  )
    return null;
  return {
    year,
    month,
    day,
    value: `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`,
  };
}

function compareDates(left: unknown, right: unknown): number {
  return String(left).localeCompare(String(right));
}

interface MonthShiftResult {
  year: number;
  month: number;
}

function monthShift(year: number, month: number, delta: number): MonthShiftResult {
  const absolute = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(absolute / 12),
    month: (((absolute % 12) + 12) % 12) + 1,
  };
}

function daysInMonth(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 1);
  date.setUTCMonth(month);
  date.setUTCDate(0);
  return date.getUTCDate();
}

function mondayIndex(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, 1);
  date.setUTCHours(0, 0, 0, 0);
  return (date.getUTCDay() + 6) % 7;
}

function addDays(value: string, delta: number): string {
  const parsed = parseDate(value);
  if (!parsed) return "";
  const date = new Date(0);
  date.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day + delta);
  date.setUTCHours(0, 0, 0, 0);
  const year = date.getUTCFullYear();
  if (year < 1 || year > 9999) return value;
  return `${String(year).padStart(4, "0")}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatDisplay(start: unknown, end: unknown, mode: string): string {
  const parsedStart = parseDate(start);
  if (!parsedStart) return "";
  const date = new Date(0);
  date.setUTCFullYear(parsedStart.year, parsedStart.month - 1, parsedStart.day);
  const format = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
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
      timeZone: "UTC",
    }).format(date);
    return `${parsedStart.day}–${parsedEnd.day} ${monthYear}`;
  }
  return `${format.format(date)} – ${format.format(endDate)}`;
}

interface DateRangePickerOptions {
  input: HTMLInputElement;
  popover: HTMLElement;
  grid: HTMLElement;
  heading: HTMLElement;
  yearInput: HTMLInputElement;
  previousButton: HTMLElement;
  nextButton: HTMLElement;
  clearButton: HTMLElement;
  startInput: HTMLInputElement;
  endInput: HTMLInputElement;
  mode?: string;
}

class DateRangePicker {
  input: HTMLInputElement;
  popover: HTMLElement;
  grid: HTMLElement;
  heading: HTMLElement;
  yearInput: HTMLInputElement;
  previousButton: HTMLElement;
  nextButton: HTMLElement;
  clearButton: HTMLElement;
  startInput: HTMLInputElement;
  endInput: HTMLInputElement;
  mode: "range" | "event";
  start: string;
  end: string;
  pendingStart: string;
  viewYear: number;
  viewMonth: number;

  constructor(options: DateRangePickerOptions) {
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

  private bind(): void {
    this.input.addEventListener("click", () => this.open());
    this.input.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        this.open();
      }
    });

    this.previousButton.addEventListener("click", () => this.shiftMonth(-1));
    this.nextButton.addEventListener("click", () => this.shiftMonth(1));
    this.clearButton.addEventListener("click", () => {
      this.clear();
      (this.popover as any).hidePopover();
      this.input.focus();
    });
    this.yearInput.addEventListener("change", () => {
      const year = Math.max(1, Math.min(9999, Number(this.yearInput.value) || this.viewYear));
      this.viewYear = year;
      this.render();
    });

    this.grid.addEventListener("click", (event: Event) => {
      const button = (event.target as HTMLElement)?.closest("button[data-date]");
      if (!button) return;
      this.choose((button as any).dataset.date);
    });

    this.grid.addEventListener("keydown", (event: KeyboardEvent) => {
      const button = (event.target as HTMLElement)?.closest("button[data-date]");
      if (!button) return;
      const keyDeltas: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };
      const keyDelta = keyDeltas[event.key];
      if (keyDelta !== undefined) {
        event.preventDefault();
        this.focusDate(addDays((button as any).dataset.date, keyDelta));
        return;
      }
      if (event.key === "PageUp" || event.key === "PageDown") {
        event.preventDefault();
        const direction = event.key === "PageUp" ? -1 : 1;
        const parsed = parseDate((button as any).dataset.date);
        if (!parsed) return;
        const shifted = monthShift(parsed.year, parsed.month, direction);
        const day = Math.min(parsed.day, daysInMonth(shifted.year, shifted.month));
        this.focusDate(
          `${String(shifted.year).padStart(4, "0")}-${pad(shifted.month)}-${pad(day)}`,
        );
      }
    });

    this.popover.addEventListener("toggle", (event: any) => {
      if (event.newState === "open") {
        const selected = parseDate(this.pendingStart || this.start);
        if (selected) {
          this.viewYear = selected.year;
          this.viewMonth = selected.month;
        }
        this.render();
        requestAnimationFrame(() => {
          (this.grid.querySelector('button[tabindex="0"]') as HTMLButtonElement)?.focus();
        });
      }
    });
  }

  setMode(mode: string): void {
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

  open(): void {
    if (!(this.popover as any).matches(":popover-open"))
      (this.popover as any).showPopover({ source: this.input });
  }

  shiftMonth(delta: number): void {
    const next = monthShift(this.viewYear, this.viewMonth, delta);
    this.viewYear = Math.max(1, Math.min(9999, next.year));
    this.viewMonth = next.month;
    this.render();
  }

  focusDate(value: string): void {
    const parsed = parseDate(value);
    if (!parsed) return;
    this.viewYear = parsed.year;
    this.viewMonth = parsed.month;
    this.render();
    requestAnimationFrame(() => {
      (
        this.grid.querySelector(`button[data-date="${CSS.escape(value)}"]`) as HTMLButtonElement
      )?.focus();
    });
  }

  private choose(value: string): void {
    if (!parseDate(value)) return;

    if (this.mode === "event") {
      this.start = value;
      this.end = "";
      this.pendingStart = "";
      this.sync(true);
      (this.popover as any).hidePopover();
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
    (this.popover as any).hidePopover();
    this.input.focus();
  }

  setRange(start: unknown, end: unknown = ""): void {
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

  clear(): void {
    this.start = "";
    this.end = "";
    this.pendingStart = "";
    this.sync(true);
    this.render();
  }

  private sync(dispatch: boolean = false): void {
    this.startInput.value = this.start;
    this.endInput.value = this.mode === "range" ? this.end : "";
    this.input.value = formatDisplay(this.start, this.end, this.mode);
    this.input.setAttribute(
      "aria-label",
      this.input.value
        ? `${this.mode === "range" ? "Date range" : "Date"}: ${this.input.value}`
        : this.mode === "range"
          ? "Choose date range"
          : "Choose date",
    );
    if (dispatch) {
      this.startInput.dispatchEvent(new Event("change", { bubbles: true }));
      this.endInput.dispatchEvent(new Event("change", { bubbles: true }));
      this.input.dispatchEvent(
        new CustomEvent("daterangechange", {
          bubbles: true,
          detail: { start: this.start, end: this.end, mode: this.mode },
        }),
      );
    }
  }

  private render(): void {
    this.heading.textContent = MONTHS[this.viewMonth - 1] ?? "";
    this.yearInput.value = String(this.viewYear);

    const leading = mondayIndex(this.viewYear, this.viewMonth);
    const previous = monthShift(this.viewYear, this.viewMonth, -1);
    const previousDays = daysInMonth(previous.year, previous.month);
    const currentDays = daysInMonth(this.viewYear, this.viewMonth);
    const cells: Array<{
      year: number;
      month: number;
      day: number;
      value: string;
      outside: boolean;
    }> = [];

    for (let index = 0; index < 42; index += 1) {
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

      cells.push({
        year,
        month,
        day,
        outside,
        value: `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`,
      });
    }

    const start = this.pendingStart || this.start;
    const end = this.end;

    renderLit(
      html`
        ${WEEKDAYS.map((weekday) => html`<span class="range-calendar-weekday">${weekday}</span>`)}
        ${repeat(
          cells,
          (cell) => cell.value,
          (cell) => {
            const classes = ["range-calendar-day"];
            if (cell.outside) classes.push("is-outside");
            if (cell.value === start) classes.push("is-start");
            if (cell.value === end) classes.push("is-end");
            if (
              start &&
              end &&
              compareDates(cell.value, start) >= 0 &&
              compareDates(cell.value, end) <= 0
            ) {
              classes.push("is-in-range");
            }

            const date = new Date(0);
            date.setUTCFullYear(cell.year, cell.month - 1, cell.day);
            const ariaLabel = new Intl.DateTimeFormat(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
              timeZone: "UTC",
            }).format(date);

            return html`
              <button
                type="button"
                class=${classes.join(" ")}
                data-date=${cell.value}
                tabindex="-1"
                aria-label=${ariaLabel}
              >
                ${cell.day}
              </button>
            `;
          },
        )}
      `,
      this.grid,
    );

    const preferred =
      this.grid.querySelector(
        `button[data-date="${CSS.escape(this.pendingStart || this.start || "")}"]`,
      ) ||
      this.grid.querySelector("button:not(.is-outside)") ||
      this.grid.querySelector("button");
    if (preferred) (preferred as HTMLButtonElement).tabIndex = 0;
  }
}

export function create(options: DateRangePickerOptions): DateRangePicker {
  return new DateRangePicker(options);
}

const TimelineDateRangePickerObj = {
  create,
  formatDisplay,
  parseDate,
} as const;

export const TimelineDateRangePicker = Object.freeze(TimelineDateRangePickerObj);
