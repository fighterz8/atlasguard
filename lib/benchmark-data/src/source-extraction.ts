import { APPROVED_ACS_COMMUTE_SOURCE } from "./source-registry";

type TableRow = Readonly<Record<string, number>>;

const parseInteger = (value: string, field: string, geoId: string): number => {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(
      `Expected integer ${field} for ${geoId}, received ${value}.`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Unsafe integer ${field} for ${geoId}.`);
  }
  return parsed;
};

const extractRows = (
  text: string,
  fields: readonly string[],
  expectedGeoIds: ReadonlySet<string>,
): ReadonlyMap<string, TableRow> => {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split("|") ?? [];
  const geoIndex = header.indexOf("GEO_ID");
  const fieldIndexes = fields.map((field) => header.indexOf(field));
  if (geoIndex < 0 || fieldIndexes.some((index) => index < 0)) {
    throw new Error(
      "Official ACS table is missing a required extraction column.",
    );
  }

  const rows = new Map<string, TableRow>();
  lines.slice(1).forEach((line) => {
    const values = line.split("|");
    const geoId = values[geoIndex];
    if (!expectedGeoIds.has(geoId)) return;
    if (rows.has(geoId)) {
      throw new Error(`Official ACS table contains duplicate row ${geoId}.`);
    }
    rows.set(
      geoId,
      Object.fromEntries(
        fields.map((field, index) => [
          field,
          parseInteger(values[fieldIndexes[index]] ?? "", field, geoId),
        ]),
      ),
    );
  });
  expectedGeoIds.forEach((geoId) => {
    if (!rows.has(geoId)) {
      throw new Error(`Official ACS table is missing row ${geoId}.`);
    }
  });
  return rows;
};

export const extractCommuteRowsFromOfficialTables = (
  b08013Text: string,
  b08006Text: string,
) =>
  extractCommuteRowsFromOfficialTablesForMetros(
    b08013Text,
    b08006Text,
    APPROVED_ACS_COMMUTE_SOURCE.geographies,
  );

type MetroGeographyMap = Readonly<
  Record<string, { readonly acsGeoId: string }>
>;

export const extractCommuteRowsFromOfficialTablesForMetros = <
  Metros extends MetroGeographyMap,
>(
  b08013Text: string,
  b08006Text: string,
  metros: Metros,
) => {
  const expectedGeoIds = new Set(
    Object.values(metros).map(({ acsGeoId }) => acsGeoId),
  );
  const aggregateRows = extractRows(
    b08013Text,
    ["B08013_E001", "B08013_M001"],
    expectedGeoIds,
  );
  const workerRows = extractRows(
    b08006Text,
    ["B08006_E001", "B08006_M001", "B08006_E017", "B08006_M017"],
    expectedGeoIds,
  );

  return Object.fromEntries(
    Object.entries(metros).map(([metroSlug, metro]) => {
      const geoId = metro.acsGeoId;
      const aggregate = aggregateRows.get(geoId);
      const workers = workerRows.get(geoId);
      if (aggregate === undefined || workers === undefined) {
        throw new Error(`Extraction invariant failed for ${geoId}.`);
      }
      return [
        metroSlug,
        {
          aggregateTravelTimeMinutes: {
            estimate: aggregate.B08013_E001,
            marginOfError90: aggregate.B08013_M001,
          },
          workers16AndOver: {
            estimate: workers.B08006_E001,
            marginOfError90: workers.B08006_M001,
          },
          workedFromHome: {
            estimate: workers.B08006_E017,
            marginOfError90: workers.B08006_M017,
          },
        },
      ];
    }),
  );
};

export const extractCbsaLabelsFromGeographyInventory = (text: string) => {
  return extractCbsaLabelsFromGeographyInventoryForMetros(
    text,
    APPROVED_ACS_COMMUTE_SOURCE.geographies,
  );
};

export const extractCbsaLabelsFromGeographyInventoryForMetros = <
  Metros extends MetroGeographyMap,
>(
  text: string,
  metros: Metros,
) => {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split("|") ?? [];
  const geoIdIndex = header.indexOf("GEO_ID");
  const nameIndex = header.indexOf("NAME");
  const cbsaIndex = header.indexOf("CBSA");
  if (geoIdIndex < 0 || nameIndex < 0 || cbsaIndex < 0) {
    throw new Error("ACS geography inventory lacks GEO_ID, NAME, or CBSA.");
  }
  return Object.fromEntries(
    Object.entries(metros).map(([metroSlug, expected]) => {
      const matchingRows = lines
        .slice(1)
        .map((line) => line.split("|"))
        .filter((values) => values[geoIdIndex] === expected.acsGeoId);
      if (matchingRows.length !== 1) {
        throw new Error(
          `Expected one ACS geography row for ${expected.acsGeoId}.`,
        );
      }
      const values = matchingRows[0];
      return [
        metroSlug,
        {
          acsGeoId: values[geoIdIndex],
          cbsaCode: values[cbsaIndex],
          cbsaLabel: values[nameIndex],
        },
      ];
    }),
  );
};
