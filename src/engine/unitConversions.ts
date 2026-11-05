export interface UnitPair {
  fromUnit: string;
  toUnit: string;
  factor: number; // how many toUnits are in 1 fromUnit
}

export const STANDARD_CONVERSIONS: UnitPair[] = [
  // Weight
  { fromUnit: 'kg', toUnit: 'g', factor: 1000 },
  { fromUnit: 'kg', toUnit: 'gram', factor: 1000 },
  { fromUnit: 'kg', toUnit: 'mg', factor: 1000000 },
  { fromUnit: 'g', toUnit: 'mg', factor: 1000 },
  { fromUnit: 'gram', toUnit: 'mg', factor: 1000 },
  { fromUnit: 'ton', toUnit: 'kg', factor: 1000 },
  { fromUnit: 'lb', toUnit: 'g', factor: 453.592 },

  // Volume
  { fromUnit: 'l', toUnit: 'ml', factor: 1000 },
  { fromUnit: 'liter', toUnit: 'ml', factor: 1000 },
  { fromUnit: 'liter', toUnit: 'l', factor: 1 },
  { fromUnit: 'gallon', toUnit: 'liter', factor: 3.78541 },

  // Length
  { fromUnit: 'm', toUnit: 'cm', factor: 100 },
  { fromUnit: 'meter', toUnit: 'cm', factor: 100 },
  { fromUnit: 'm', toUnit: 'mm', factor: 1000 },
  { fromUnit: 'meter', toUnit: 'mm', factor: 1000 },
  { fromUnit: 'cm', toUnit: 'mm', factor: 10 },
  { fromUnit: 'yard', toUnit: 'm', factor: 0.9144 },

  // Packaging / Counts
  { fromUnit: 'box', toUnit: 'pcs', factor: 1 },
  { fromUnit: 'pack', toUnit: 'pcs', factor: 1 },
  { fromUnit: 'dozen', toUnit: 'pcs', factor: 12 },
  { fromUnit: 'gross', toUnit: 'pcs', factor: 144 },
];

export function getSuggestedConversionFactor(purchaseUnit: string, usageUnit: string): number {
  const p = purchaseUnit.trim().toLowerCase();
  const u = usageUnit.trim().toLowerCase();

  if (p === u) return 1;

  // Direct match: e.g. from kg to g -> 1000
  const match = STANDARD_CONVERSIONS.find(
    (item) => item.fromUnit.toLowerCase() === p && item.toUnit.toLowerCase() === u
  );
  if (match) return match.factor;

  // Reverse match: e.g. from g to kg -> 0.001
  const reverseMatch = STANDARD_CONVERSIONS.find(
    (item) => item.fromUnit.toLowerCase() === u && item.toUnit.toLowerCase() === p
  );
  if (reverseMatch && reverseMatch.factor > 0) return 1 / reverseMatch.factor;

  return 1;
}

export function convertPurchasePriceToUsagePrice(
  purchasePrice: number,
  purchaseUnit: string,
  usageUnit: string,
  customFactor?: number
): number {
  if (purchasePrice <= 0) return 0;

  // If user provided a specific custom conversion factor
  if (customFactor && customFactor > 0) {
    return purchasePrice / customFactor;
  }

  const factor = getSuggestedConversionFactor(purchaseUnit, usageUnit);
  if (factor <= 0) return purchasePrice;

  return purchasePrice / factor;
}

export function calculateCostPerConsumptionUnit(
  purchasePrice: number,
  conversionFactor: number
): number {
  if (conversionFactor <= 0) return purchasePrice;
  return purchasePrice / conversionFactor;
}

export const PURCHASE_UNITS = [
  'Kg',
  'Gram',
  'Liter',
  'Milliliter',
  'Pcs',
  'Box',
  'Pack',
  'Meter',
  'Roll',
  'Other',
];

export const USAGE_UNITS = [
  'Gram',
  'Kg',
  'Milliliter',
  'Liter',
  'Pcs',
  'Meter',
  'Centimeter',
  'Other',
];

export const COMMON_UNITS = [
  { label: 'Gram (g)', value: 'g' },
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Milliliter (ml)', value: 'ml' },
  { label: 'Liter (l)', value: 'l' },
  { label: 'Piece (pcs)', value: 'pcs' },
  { label: 'Meter (m)', value: 'm' },
  { label: 'Centimeter (cm)', value: 'cm' },
  { label: 'Box (box)', value: 'box' },
  { label: 'Pack (pack)', value: 'pack' },
];
