export function escapeCsvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const compact = raw.trim();
  const numericLike = /^[+-]?\d+(?:[.,]\d+)?$/.test(compact);
  const formulaLike = /^[=+\-@]/.test(raw.trimStart());
  const safe = typeof value === "string" && formulaLike && !numericLike ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvLine(row: unknown[]) {
  return row.map(escapeCsvCell).join(";");
}

export function createCsvStream<T>(
  header: unknown[],
  pageSize: number,
  fetchPage: (page: number) => Promise<T[]>,
  mapRow: (row: T) => unknown[],
) {
  const encoder = new TextEncoder();
  let page = 1;
  let started = false;
  let finished = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return;
      try {
        if (!started) {
          controller.enqueue(encoder.encode("\uFEFF" + csvLine(header) + "\r\n"));
          started = true;
        }

        const rows = await fetchPage(page);
        if (rows.length === 0) {
          finished = true;
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(rows.map((row) => csvLine(mapRow(row))).join("\r\n") + "\r\n"));

        if (rows.length < pageSize) {
          finished = true;
          controller.close();
          return;
        }
        page += 1;
      } catch (error) {
        finished = true;
        controller.error(error);
      }
    },
  });
}
