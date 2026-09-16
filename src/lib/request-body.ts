export class RequestBodyError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/** Begrenzung anhand tatsächlich gelesener Bytes, auch ohne Content-Length. */
export async function readJsonBody(request: Request, maxBytes = 16384): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError(413, "Die Anfrage ist zu umfangreich.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400, "Ungültige Anfrage.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError(413, "Die Anfrage ist zu umfangreich.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new RequestBodyError(400, "Ungültige Anfrage.");
  }
}
