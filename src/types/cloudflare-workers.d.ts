declare module "cloudflare:workers" {
  export const env: {
    AI: {
      run(model: string, input: Record<string, unknown>): Promise<unknown>;
    };
    [key: string]: unknown;
  };
}
