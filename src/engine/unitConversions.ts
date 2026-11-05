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

export function getSuggestedConversionFactor(purchaseUnit: string, consumptionUnit: string): number {
  const p = purchaseUnit.trim().toLowerCase();
  const c = consumptionUnit.trim().toLowerCase();

  if (p === c) return 1;

  const match = STANDARD_CONVERSIONS.find(
    (item) => item.fromUnit.toLowerCase() === p && item.toUnit.toLowerCase() === c
  );
  if (match) return match.factor;

  const reverseMatch = STANDARD_CONVERSIONS.find(
    (item) => item.fromUnit.toLowerCase() === c && item.toUnit.toLowerCase() === p
  );
  if (reverseMatch && reverseMatch.factor > 0) return 1 / reverseMatch.factor;

  return 1;
}

export function calculateCostPerConsumptionUnit(
  purchasePrice: number,
  conversionFactor: number
): number {
  if (conversionFactor <= 0) return purchasePrice;
  return purchasePrice / conversionFactor;
}

export const COMMON_UNITS = [
  { label: 'Weight (Gram - g)', value: 'g' },
  { label: 'Weight (Kilogram - kg)', value: 'kg' },
  { label: 'Weight (Milligram - mg)', value: 'mg' },
  { label: 'Volume (Milliliter - ml)', value: 'ml' },
  { label: 'Volume (Liter - l)', value: 'l' },
  { label: 'Length (Meter - m)', value: 'm' },
  { label: 'Length (Centimeter - cm)', value: 'cm' },
  { label: 'Piece (pcs)', value: 'pcs' },
  { label: 'Box (box)', value: 'box' },
  { label: 'Pack (pack)', value: 'pack' },
  { label: 'Set (set)', value: 'set' },
  { label: 'Roll (roll)', value: 'roll' },
  { label: 'Batch (batch)', value: 'batch' },
];
