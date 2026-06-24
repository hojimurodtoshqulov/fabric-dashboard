export const config = {
  app: {
    name: "Fabric Automation",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    secret: process.env.APP_SECRET!,
    isDev: process.env.NODE_ENV === "development",
  },
  db: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    password: process.env.REDIS_PASSWORD,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini",
    transcriptionModel: "whisper-1",
  },
  googleTts: {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
    languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE || "uz-UZ",
  },
  goip: {
    host: process.env.GOIP_HOST!,
    port: Number(process.env.GOIP_PORT) || 8090,
    username: process.env.GOIP_USERNAME!,
    password: process.env.GOIP_PASSWORD!,
    trunk: process.env.GOIP_TRUNK || "goip_line1",
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET!,
  },
  sms: {
    apiUrl: process.env.SMS_API_URL!,
    apiKey: process.env.SMS_API_KEY!,
    senderId: process.env.SMS_SENDER_ID || "FABRIC",
  },
  whisper: {
    apiUrl: process.env.WHISPER_API_URL || "http://localhost:8001/transcribe",
  },
  website: {
    apiUrl: process.env.WEBSITE_API_URL!,
    apiKey: process.env.WEBSITE_API_KEY!,
  },
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    windowMs: Number(process.env.RATE_LIMIT_WINDOW) || 60000,
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || "./uploads",
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 10485760,
  },
} as const;
