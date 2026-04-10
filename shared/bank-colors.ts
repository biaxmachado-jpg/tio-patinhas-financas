/**
 * Bank color scheme mapping
 * Each bank has a primary color and optional secondary colors for UI theming
 */

export interface BankTheme {
  name: string;
  primaryColor: string;
  primaryColorHex: string;
  textColor: string;
  accentColor?: string;
}

export const BANK_THEMES: Record<string, BankTheme> = {
  itau: {
    name: "Itaú",
    primaryColor: "from-orange-500 to-orange-600",
    primaryColorHex: "#FF6B35",
    textColor: "text-white",
    accentColor: "bg-orange-100",
  },
  bradesco: {
    name: "Bradesco",
    primaryColor: "from-red-600 to-red-700",
    primaryColorHex: "#C41E3A",
    textColor: "text-white",
    accentColor: "bg-red-100",
  },
  brb: {
    name: "BRB",
    primaryColor: "from-black to-gray-800",
    primaryColorHex: "#000000",
    textColor: "text-white",
    accentColor: "bg-gray-100",
  },
  caixa: {
    name: "Caixa",
    primaryColor: "from-blue-600 to-blue-700",
    primaryColorHex: "#003DA5",
    textColor: "text-white",
    accentColor: "bg-blue-100",
  },
  santander: {
    name: "Santander",
    primaryColor: "from-red-500 to-red-600",
    primaryColorHex: "#EC1C24",
    textColor: "text-white",
    accentColor: "bg-red-100",
  },
  nubank: {
    name: "Nubank",
    primaryColor: "from-purple-600 to-purple-700",
    primaryColorHex: "#820AD1",
    textColor: "text-white",
    accentColor: "bg-purple-100",
  },
  inter: {
    name: "Inter",
    primaryColor: "from-orange-500 to-orange-600",
    primaryColorHex: "#FF6B00",
    textColor: "text-white",
    accentColor: "bg-orange-100",
  },
  bb: {
    name: "Banco do Brasil",
    primaryColor: "from-yellow-500 to-yellow-600",
    primaryColorHex: "#FFB81C",
    textColor: "text-gray-900",
    accentColor: "bg-yellow-100",
  },
  default: {
    name: "Banco",
    primaryColor: "from-slate-600 to-slate-700",
    primaryColorHex: "#475569",
    textColor: "text-white",
    accentColor: "bg-slate-100",
  },
};

/**
 * Get bank theme by bank name
 * Falls back to default theme if bank not found
 */
export function getBankTheme(bankName: string): BankTheme {
  const normalized = bankName.toLowerCase().replace(/\s+/g, "");
  return BANK_THEMES[normalized] || BANK_THEMES.default;
}

/**
 * Get all available banks
 */
export function getAvailableBanks(): Array<{ key: string; name: string }> {
  return Object.entries(BANK_THEMES)
    .filter(([key]) => key !== "default")
    .map(([key, theme]) => ({ key, name: theme.name }));
}
