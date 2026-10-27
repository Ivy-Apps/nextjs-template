type Route = { status: number; body: unknown };

/**
 * An in-memory backend standing in for `fetch`: it answers the routes it is
 * given, keyed by absolute URL, and 404s everything else.
 */
export function fakeBackend(routes: Record<string, Route>): typeof fetch {
  return async (input) => {
    const url = new Request(input).url;
    const route = routes[url] ?? {
      status: 404,
      body: { message: "Not found" },
    };
    return Response.json(route.body, { status: route.status });
  };
}
