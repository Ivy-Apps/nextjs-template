import { once } from "node:events";
import { createServer, type IncomingMessage } from "node:http";
import { fakeBackend } from "@test/fakeBackend";

export const FAKE_BACKEND_PORT = 3078;

/**
 * Playwright global setup: serves the in-memory DummyJSON on
 * `FAKE_BACKEND_PORT` for the whole run, so the app under test (started with
 * `BE_URL` pointing here) never reaches the real DummyJSON. Returns the
 * teardown that stops it.
 */
export default async function serveFakeBackend(): Promise<() => Promise<void>> {
  const backend = fakeBackend();
  const server = createServer(async (incoming, outgoing) => {
    const response = await backend.fetch(await toRequest(incoming));
    outgoing.statusCode = response.status;
    response.headers.forEach((value, name) => {
      if (name !== "set-cookie") outgoing.setHeader(name, value);
    });
    outgoing.setHeader("set-cookie", response.headers.getSetCookie());
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  server.listen(FAKE_BACKEND_PORT);
  await once(server, "listening");
  return async () => {
    server.close();
    await once(server, "close");
  };
}

async function toRequest(incoming: IncomingMessage): Promise<Request> {
  const chunks: Array<Buffer> = [];
  for await (const chunk of incoming) chunks.push(chunk as Buffer);
  const method = incoming.method ?? "GET";
  return new Request(`http://localhost${incoming.url ?? "/"}`, {
    method,
    headers: Object.entries(incoming.headers).flatMap(([name, value]) =>
      value === undefined ? [] : [[name, String(value)] as [string, string]],
    ),
    ...(method === "GET" || method === "HEAD"
      ? {}
      : { body: Buffer.concat(chunks) }),
  });
}
