export type BulkIngestFormat = "csv" | "tsv" | "json" | "arrow" | "parquet";
export type BulkRow = Readonly<Record<string, unknown>>;

export interface BulkIngestInput {
  readonly format: BulkIngestFormat;
  readonly data: string | ArrayBuffer | Uint8Array;
}

export interface BinaryTabularAdapter {
  parse(data: Uint8Array): Promise<readonly BulkRow[]> | readonly BulkRow[];
}

export interface BulkIngestAdapters {
  readonly arrow?: BinaryTabularAdapter;
  readonly parquet?: BinaryTabularAdapter;
}

export interface NumericColumnProfile {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly standardDeviation: number;
  readonly q25: number;
  readonly q50: number;
  readonly q75: number;
}

export interface ColumnProfile {
  readonly name: string;
  readonly rowCount: number;
  readonly nullCount: number;
  readonly nullFraction: number;
  readonly uniqueCount: number;
  readonly inferredType: "null" | "number" | "string" | "boolean" | "object" | "mixed";
  readonly samples: readonly unknown[];
  readonly numeric?: NumericColumnProfile;
}

export interface BulkDataProfile {
  readonly rowCount: number;
  readonly columns: readonly ColumnProfile[];
}

function bytes(value: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value;
  return new Uint8Array(value);
}

function textInput(value: string | ArrayBuffer | Uint8Array): string {
  return typeof value === "string" ? value : new TextDecoder().decode(bytes(value));
}

function parseDelimitedRecords(input: string, delimiter: "," | "\t"): readonly BulkRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += character;
  }

  if (quoted) throw new Error("Delimited input contains an unterminated quoted field.");
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (!rows.length) return Object.freeze([]);

  const headers = rows[0].map((value) => value.trim());
  if (headers.some((value) => !value)) throw new Error("Delimited input contains an empty column name.");
  if (new Set(headers).size !== headers.length) {
    throw new Error("Delimited input contains duplicate column names.");
  }

  return Object.freeze(
    rows.slice(1).map((values) => {
      const record: Record<string, unknown> = {};
      for (let index = 0; index < headers.length; index += 1) {
        const value = values[index] ?? "";
        record[headers[index]] = value === "" ? null : value;
      }
      return Object.freeze(record);
    }),
  );
}

function parseJsonRows(input: string): readonly BulkRow[] {
  const parsed: unknown = JSON.parse(input);
  if (!Array.isArray(parsed)) throw new Error("Bulk JSON input must be an array of objects.");

  return Object.freeze(
    parsed.map((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Bulk JSON row ${index + 1} must be an object.`);
      }
      return Object.freeze({ ...(value as Readonly<Record<string, unknown>>) });
    }),
  );
}

export async function parseBulkRows(
  input: BulkIngestInput,
  adapters: BulkIngestAdapters = {},
): Promise<readonly BulkRow[]> {
  if (input.format === "csv") return parseDelimitedRecords(textInput(input.data), ",");
  if (input.format === "tsv") return parseDelimitedRecords(textInput(input.data), "\t");
  if (input.format === "json") return parseJsonRows(textInput(input.data));

  const adapter = input.format === "arrow" ? adapters.arrow : adapters.parquet;
  if (!adapter) {
    throw new Error(`${input.format} ingest requires a configured binary tabular adapter.`);
  }

  const rows = await adapter.parse(bytes(input.data));
  return Object.freeze(
    rows.map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`${input.format} adapter row ${index + 1} must be an object.`);
      }
      return Object.freeze({ ...row });
    }),
  );
}

function inferredType(values: readonly unknown[]): ColumnProfile["inferredType"] {
  const types = new Set(
    values
      .filter((value) => value !== null && value !== undefined)
      .map((value) => {
        if (Array.isArray(value)) return "object";
        const type = typeof value;
        return type === "number" || type === "string" || type === "boolean"
          ? type
          : "object";
      }),
  );

  if (!types.size) return "null";
  if (types.size === 1) return [...types][0] as ColumnProfile["inferredType"];
  return "mixed";
}

function quantile(sorted: readonly number[], fraction: number): number {
  if (!sorted.length) return Number.NaN;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const left = sorted[lower] ?? sorted[0];
  const right = sorted[upper] ?? sorted.at(-1) ?? left;
  return left + (right - left) * (position - lower);
}

function numericProfile(values: readonly unknown[]): NumericColumnProfile | undefined {
  const numbers = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (numbers.length !== values.filter((value) => value !== null && value !== undefined).length) {
    return undefined;
  }
  if (!numbers.length) return undefined;

  const sorted = [...numbers].sort((left, right) => left - right);
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const variance =
    numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numbers.length;

  return Object.freeze({
    min: sorted[0],
    max: sorted.at(-1) ?? sorted[0],
    mean,
    standardDeviation: Math.sqrt(variance),
    q25: quantile(sorted, 0.25),
    q50: quantile(sorted, 0.5),
    q75: quantile(sorted, 0.75),
  });
}

function stableValueKey(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && Number.isNaN(value)) return "number:NaN";
  return `${typeof value}:${JSON.stringify(value)}`;
}

export function profileBulkRows(
  rows: readonly BulkRow[],
  sampleLimit = 5,
): BulkDataProfile {
  const columnNames = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort((a, b) =>
    a.localeCompare(b),
  );

  const columns = columnNames.map((name) => {
    const values = rows.map((row) => row[name] ?? null);
    const nullCount = values.filter((value) => value === null || value === undefined).length;
    const nonNull = values.filter((value) => value !== null && value !== undefined);
    const uniqueCount = new Set(nonNull.map(stableValueKey)).size;
    const samples = Object.freeze(
      [...new Map(nonNull.map((value) => [stableValueKey(value), value])).values()].slice(
        0,
        Math.max(0, Math.trunc(sampleLimit)),
      ),
    );
    const numeric = numericProfile(values);

    return Object.freeze({
      name,
      rowCount: rows.length,
      nullCount,
      nullFraction: rows.length ? nullCount / rows.length : 0,
      uniqueCount,
      inferredType: inferredType(values),
      samples,
      ...(numeric ? { numeric } : {}),
    });
  });

  return Object.freeze({
    rowCount: rows.length,
    columns: Object.freeze(columns),
  });
}
