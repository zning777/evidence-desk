declare namespace Cloudflare {
  interface Env {
    DEEPSEEK_API_KEY?: string;
    FUYAO_API_KEY?: string;
    DEMO_ACCESS_CODE?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
