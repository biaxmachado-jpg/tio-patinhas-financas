import { createTRPCReact } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || "";
};
