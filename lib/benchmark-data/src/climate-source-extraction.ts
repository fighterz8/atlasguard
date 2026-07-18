import { APPROVED_NOAA_HEAT_SOURCE } from "./source-registry";

const parseCsvRecord = (line: string): string[] => {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("Official NOAA CSV contains an open quote.");
  values.push(value.trim());
  return values;
};

const requiredColumns = [
  "STATION",
  "LATITUDE",
  "LONGITUDE",
  "ELEVATION",
  "NAME",
  APPROVED_NOAA_HEAT_SOURCE.metricColumn,
  `meas_flag_${APPROVED_NOAA_HEAT_SOURCE.metricColumn}`,
  `comp_flag_${APPROVED_NOAA_HEAT_SOURCE.metricColumn}`,
  `years_${APPROVED_NOAA_HEAT_SOURCE.metricColumn}`,
] as const;

export const extractNoaaHeatStation = (text: string) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length !== 2) {
    throw new Error("Expected one NOAA station header and one data row.");
  }
  const header = parseCsvRecord(lines[0]);
  const row = parseCsvRecord(lines[1]);
  const indexOf = (column: string): number => {
    const index = header.indexOf(column);
    if (index < 0) throw new Error(`Official NOAA CSV lacks ${column}.`);
    return index;
  };
  const values = Object.fromEntries(
    requiredColumns.map((column) => [column, row[indexOf(column)] ?? ""]),
  );
  const stationId = values.STATION;
  const approved =
    APPROVED_NOAA_HEAT_SOURCE.extractedStations[
      stationId as keyof typeof APPROVED_NOAA_HEAT_SOURCE.extractedStations
    ];
  if (approved === undefined) {
    throw new Error(`NOAA station ${stationId} is not approved.`);
  }
  const number = (column: string): number => {
    const parsed = Number(values[column]);
    if (!Number.isFinite(parsed)) {
      throw new Error(`NOAA station ${stationId} has invalid ${column}.`);
    }
    return parsed;
  };
  return {
    stationId,
    name: values.NAME,
    latitude: number("LATITUDE"),
    longitude: number("LONGITUDE"),
    elevationMeters: number("ELEVATION"),
    annualDaysAbove90F: number(APPROVED_NOAA_HEAT_SOURCE.metricColumn),
    measurementFlag:
      values[`meas_flag_${APPROVED_NOAA_HEAT_SOURCE.metricColumn}`],
    completenessFlag:
      values[`comp_flag_${APPROVED_NOAA_HEAT_SOURCE.metricColumn}`],
    years: number(`years_${APPROVED_NOAA_HEAT_SOURCE.metricColumn}`),
  };
};

export const extractNoaaHeatInventoryStations = (text: string) => {
  const expectedIds = new Set(
    Object.keys(APPROVED_NOAA_HEAT_SOURCE.extractedStations),
  );
  const extracted = new Map<
    string,
    {
      name: string;
      latitude: number;
      longitude: number;
      elevationMeters: number;
    }
  >();
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(
      /^(\S{11})\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+[A-Z]{2}\s+(.{1,30})/,
    );
    if (match === null || !expectedIds.has(match[1])) return;
    if (extracted.has(match[1])) {
      throw new Error(`NOAA inventory contains duplicate station ${match[1]}.`);
    }
    extracted.set(match[1], {
      name: match[5].trim(),
      latitude: Number(match[2]),
      longitude: Number(match[3]),
      elevationMeters: Number(match[4]),
    });
  });
  expectedIds.forEach((stationId) => {
    if (!extracted.has(stationId)) {
      throw new Error(`NOAA inventory is missing station ${stationId}.`);
    }
  });
  return Object.fromEntries(extracted);
};
