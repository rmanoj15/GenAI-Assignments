export interface HealthResponse {
  app: string;
  version: string;
  uptimeSeconds: number;
  env: string;
  requestId?: string;
}
