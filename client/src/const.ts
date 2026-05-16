export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
export const getLoginUrl = () => 
  `${import.meta.env.VITE_API_URL || ""}/login`;
