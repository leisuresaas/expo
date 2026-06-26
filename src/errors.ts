export class LeisureSaasHttpError extends Error {
  readonly statusCode: number;
  readonly body: string;

  constructor(statusCode: number, body: string) {
    super(body || `HTTP ${statusCode}`);
    this.name = "LeisureSaasHttpError";
    this.statusCode = statusCode;
    this.body = body;
  }
}
