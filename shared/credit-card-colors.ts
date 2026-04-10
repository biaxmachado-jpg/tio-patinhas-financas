export interface CardBrandTheme {
  name: string;
  color: string;
  bgGradient: string;
  textColor: string;
  icon: string;
}

export const CREDIT_CARD_BRANDS: Record<string, CardBrandTheme> = {
  visa: {
    name: "Visa",
    color: "#1434CB",
    bgGradient: "from-blue-600 to-blue-700",
    textColor: "text-white",
    icon: "CreditCard",
  },
  mastercard: {
    name: "Mastercard",
    color: "#EB001B",
    bgGradient: "from-red-600 to-red-700",
    textColor: "text-white",
    icon: "CreditCard",
  },
  elo: {
    name: "Elo",
    color: "#6C2E2E",
    bgGradient: "from-orange-600 to-red-600",
    textColor: "text-white",
    icon: "CreditCard",
  },
  amex: {
    name: "American Express",
    color: "#006FCF",
    bgGradient: "from-blue-500 to-blue-600",
    textColor: "text-white",
    icon: "CreditCard",
  },
  "american express": {
    name: "American Express",
    color: "#006FCF",
    bgGradient: "from-blue-500 to-blue-600",
    textColor: "text-white",
    icon: "CreditCard",
  },
  hipercard: {
    name: "Hipercard",
    color: "#CC0000",
    bgGradient: "from-red-600 to-red-700",
    textColor: "text-white",
    icon: "CreditCard",
  },
  discover: {
    name: "Discover",
    color: "#FF6000",
    bgGradient: "from-orange-500 to-orange-600",
    textColor: "text-white",
    icon: "CreditCard",
  },
  diners: {
    name: "Diners Club",
    color: "#0079BE",
    bgGradient: "from-blue-600 to-blue-700",
    textColor: "text-white",
    icon: "CreditCard",
  },
  jcb: {
    name: "JCB",
    color: "#0066B2",
    bgGradient: "from-blue-600 to-blue-700",
    textColor: "text-white",
    icon: "CreditCard",
  },
};

export function getCardBrandTheme(brand: string): CardBrandTheme {
  const normalizedBrand = brand.toLowerCase().trim();
  return (
    CREDIT_CARD_BRANDS[normalizedBrand] || {
      name: brand,
      color: "#6366f1",
      bgGradient: "from-indigo-600 to-indigo-700",
      textColor: "text-white",
      icon: "CreditCard",
    }
  );
}

export function getCardBrandColor(brand: string): string {
  return getCardBrandTheme(brand).color;
}

export function getCardBrandGradient(brand: string): string {
  return getCardBrandTheme(brand).bgGradient;
}
