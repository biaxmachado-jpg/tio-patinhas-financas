export const ENV = {
  appId: "tiopatinhas",
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production!!",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  oAuthServerUrl: "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
