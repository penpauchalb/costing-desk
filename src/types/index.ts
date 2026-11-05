export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'GBP' | 'JPY' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

export type CostComponentCategory =
  | 'raw_materials'
  | 'ingredients'
  | 'packaging'
  | 'accessories'
  | 'consumables'
  | 'production_services'
  | 'labor'
  | 'outsourced_processing'
  | 'other';

export type CostStatus = 'confirmed' | 'pending' | 'blank';

export interface ProductGroup {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface MasterMaterial {
  id: string;
  name: string;
  category: string;
  purchaseUnit: string;
  purchasePrice: number;
  consumptionUnit: string;
  conversionFactor: number; // e.g. 1000 if 1 kg = 1000 g
  supplier?: string;
  notes?: string;
  lastUpdated: string;
}

export interface BomComponent {
  id: string;
  variantId: string;
  name: string;
  category: CostComponentCategory;
  materialId?: string | null; // linked to MasterMaterial if any
  quantityRequired: number; // consumption per finished unit
  unit: string;
  unitPrice: number; // cost per consumption unit
  costBasis: 'per_finished_unit' | 'per_batch';
  status: CostStatus;
  notes?: string;
  orderIndex?: number;
}

export type LaborCostMethod =
  | 'per_unit'
  | 'per_batch'
  | 'per_hour'
  | 'per_worker'
  | 'fixed'
  | 'custom';

export interface ProductionProcessStage {
  id: string;
  variantId: string;
  stageName: string; // e.g. Preparation, Mixing, Assembly, Packaging
  costMethod: LaborCostMethod;
  rate: number;
  workerCount?: number;
  hoursWorked?: number;
  status: CostStatus;
  notes?: string;
}

export type OverheadAllocationMethod =
  | 'fixed_per_batch'
  | 'cost_per_unit'
  | 'percentage_allocation'
  | 'hour_based'
  | 'custom';

export interface OverheadItem {
  id: string;
  variantId: string;
  name: string; // Electricity, Rent, Maintenance, etc.
  allocationMethod: OverheadAllocationMethod;
  amount: number;
  percentageBasis?: 'materials' | 'labor' | 'direct_costs';
  isDirect: boolean;
  includeInHpp: boolean;
  status: CostStatus;
  notes?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g. '250g', '500g', 'Red 2m', 'Standard'
  sku: string;
  sizeWeightVolume?: number;
  measurementUnit: string; // g, kg, ml, l, m, pcs, etc.
  plannedQuantity: number;
  actualQuantity?: number;
  targetFinishedQuantity?: number;
  wastagePercentage: number;
  defectiveQuantity: number;
  reworkQuantity: number;
  yieldPercentage: number; // 100 = 100%
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  code: string; // SKU or code
  category: string;
  description?: string;
  groupId: string | null; // null for Ungrouped Products
  productionBatch?: string;
  productionDate?: string;
  notes?: string;
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BatchPriceSnapshot {
  materialId?: string | null;
  materialName: string;
  purchasePrice: number;
  purchaseUnit: string;
  unitPriceUsed: number;
  consumptionUnit: string;
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  plannedQuantity: number;
  actualFinishedQuantity: number;
  status: 'draft' | 'in_progress' | 'finalized';
  finalizedAt?: string;
  priceSnapshots: BatchPriceSnapshot[];
  totalProductionCost: number;
  unitHpp: number;
  notes?: string;
  createdAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  productId: string;
  variantId: string;
  simulatedQuantity: number;
  materialPriceAdjustmentPercent: number; // e.g. +10% or -5%
  packagingPriceAdjustmentPercent: number;
  laborAdjustmentPercent: number;
  overheadAdjustmentPercent: number;
  wastagePercentage: number;
  notes?: string;
  createdAt: string;
}

export interface CalculatedCostSummary {
  actualFinishedQuantity: number;
  rawMaterialsTotal: number;
  packagingTotal: number;
  laborTotal: number;
  overheadTotal: number;
  otherExpensesTotal: number;
  totalProductionCost: number;
  unitHpp: number;
  unitHppExcludingIndirect: number;
  costPerMeasurementUnit: number; // e.g., cost per gram/kg/meter if applicable
  confirmedTotal: number;
  pendingTotal: number;
  hasPendingCosts: boolean;
  pendingCount: number;
  categoryBreakdown: { category: string; total: number; percentage: number }[];
}

export interface GroupSummary {
  groupId: string;
  groupName: string;
  productCount: number;
  totalFinishedUnits: number;
  totalRawMaterialsCost: number;
  totalPackagingCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalProductionCost: number;
  weightedAverageHpp: number;
}
