export type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
};

export type ApiResponse = {
  setHeader(name: string, value: string | number | readonly string[]): ApiResponse;
  status(statusCode: number): ApiResponse;
  json(payload: unknown): ApiResponse;
  send?(payload?: unknown): ApiResponse;
  end(payload?: unknown): ApiResponse;
};
