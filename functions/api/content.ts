import contentHandler from '../../api/content';

export const onRequest = async ({ request, env }: { request: Request; env: Record<string, string | undefined> }) => {
  const url = new URL(request.url);
  const headers = new Headers();
  const requestHeaders: Record<string, string> = {};
  let status = 200;
  let body: BodyInit | null = null;

  Object.entries(env).forEach(([name, value]) => {
    if (typeof value === 'string') process.env[name] = value;
  });

  const responseAdapter = {
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
      return responseAdapter;
    },
    status(statusCode: number) {
      status = statusCode;
      return responseAdapter;
    },
    json(payload: unknown) {
      headers.set('Content-Type', 'application/json; charset=utf-8');
      body = JSON.stringify(payload);
      return responseAdapter;
    },
    end(payload?: unknown) {
      body = payload == null ? null : String(payload);
      return responseAdapter;
    },
  };

  request.headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });

  await contentHandler({
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: requestHeaders,
  }, responseAdapter);

  return new Response(body, { status, headers });
};
