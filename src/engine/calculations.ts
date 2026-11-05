import {
  BomComponent,
  CalculatedCostSummary,
  CostComponentCategory,
  GroupSummary,
  MasterMaterial,
  OverheadItem,
  ProductGroup,
  ProductionProcessStage,
  ProductVariant,
  Scenario,
} from '../types';
import { calculateCostPerConsumptionUnit } from './unitConversions';

/**
 * Calculates the actual finished quantity based on planned quantity,
 * yield percentage, wastage, defects, and rework.
 */
export function calculateActualFinishedQuantity(
  variant: Pick<
    ProductVariant,
    | 'plannedQuantity'
    | 'actualQuantity'
    | 'yieldPercentage'
    | 'wastagePercentage'
    | 'defectiveQuantity'
    | 'reworkQuantity'
  >
): number {
  if (variant.actualQuantity && variant.actualQuantity > 0) {
    return variant.actualQuantity;
  }

  const planned = variant.plannedQuantity > 0 ? variant.plannedQuantity : 1;
  const yieldFactor = (variant.yieldPercentage ?? 100) / 100;
  const wastageFactor = 1 - (variant.wastagePercentage ?? 0) / 100;
  const defects = variant.defectiveQuantity ?? 0;
  const rework = variant.reworkQuantity ?? 0;

  const calculated = Math.round(planned * yieldFactor * wastageFactor - defects + rework);
  return Math.max(1, calculated);
}

/**
 * Calculates the total cost and unit cost for an individual BOM component.
 */
export function calculateBomComponentCost(
  component: BomComponent,
  finishedQuantity: number,
  masterMaterials?: MasterMaterial[]
): {
  unitPrice: number;
  costPerFinishedUnit: number;
  totalCost: number;
  totalQuantityRequired: number;
} {
  let unitPrice = component.unitPrice;

  // If linked to master material and unitPrice wasn't manually set (> 0),
  // pull latest unit cost from master material
  if (component.materialId && masterMaterials) {
    const mat = masterMaterials.find((m) => m.id === component.materialId);
    if (mat) {
      const derivedUnitPrice = calculateCostPerConsumptionUnit(
        mat.purchasePrice,
        mat.conversionFactor
      );
      if (unitPrice === 0 || unitPrice === undefined) {
        unitPrice = derivedUnitPrice;
      }
    }
  }

  const qty = component.quantityRequired || 0;
  const safeFinishedQty = finishedQuantity > 0 ? finishedQuantity : 1;

  if (component.costBasis === 'per_batch') {
    const totalCost = qty * unitPrice;
    const costPerFinishedUnit = totalCost / safeFinishedQty;
    return {
      unitPrice,
      costPerFinishedUnit,
      totalCost,
      totalQuantityRequired: qty,
    };
  } else {
    // per_finished_unit
    const costPerFinishedUnit = qty * unitPrice;
    const totalCost = costPerFinishedUnit * safeFinishedQty;
    const totalQuantityRequired = qty * safeFinishedQty;
    return {
      unitPrice,
      costPerFinishedUnit,
      totalCost,
      totalQuantityRequired,
    };
  }
}

/**
 * Calculates cost for a production process stage (labor & services).
 */
export function calculateLaborStageCost(
  stage: ProductionProcessStage,
  finishedQuantity: number
): { costPerFinishedUnit: number; totalCost: number } {
  const safeQty = finishedQuantity > 0 ? finishedQuantity : 1;
  const rate = stage.rate || 0;
  let totalCost = 0;

  switch (stage.costMethod) {
    case 'per_unit':
      totalCost = rate * safeQty;
      break;
    case 'per_batch':
    case 'fixed':
    case 'custom':
      totalCost = rate;
      break;
    case 'per_hour':
      totalCost = rate * (stage.hoursWorked || 1);
      break;
    case 'per_worker':
      totalCost = rate * (stage.workerCount || 1) * (stage.hoursWorked || 1);
      break;
    default:
      totalCost = rate * safeQty;
  }

  const costPerFinishedUnit = totalCost / safeQty;
  return { costPerFinishedUnit, totalCost };
}

/**
 * Calculates cost for an overhead item.
 */
export function calculateOverheadItemCost(
  item: OverheadItem,
  finishedQuantity: number,
  baseCosts: { materials: number; labor: number; directCosts: number }
): { costPerFinishedUnit: number; totalCost: number } {
  const safeQty = finishedQuantity > 0 ? finishedQuantity : 1;
  let totalCost = 0;

  switch (item.allocationMethod) {
    case 'fixed_per_batch':
    case 'custom':
      totalCost = item.amount || 0;
      break;
    case 'cost_per_unit':
      totalCost = (item.amount || 0) * safeQty;
      break;
    case 'percentage_allocation': {
      const pct = (item.amount || 0) / 100;
      if (item.percentageBasis === 'materials') {
        totalCost = baseCosts.materials * pct;
      } else if (item.percentageBasis === 'labor') {
        totalCost = baseCosts.labor * pct;
      } else {
        totalCost = baseCosts.directCosts * pct;
      }
      break;
    }
    case 'hour_based':
      totalCost = item.amount || 0;
      break;
    default:
      totalCost = item.amount || 0;
  }

  const costPerFinishedUnit = totalCost / safeQty;
  return { costPerFinishedUnit, totalCost };
}

/**
 * Primary HPP Calculation Engine
 */
export function calculateProductCostSummary(
  variant: ProductVariant,
  bomComponents: BomComponent[],
  laborStages: ProductionProcessStage[],
  overheadItems: OverheadItem[],
  masterMaterials?: MasterMaterial[]
): CalculatedCostSummary {
  const finishedQty = calculateActualFinishedQuantity(variant);

  let rawMaterialsTotal = 0;
  let packagingTotal = 0;
  let otherBomTotal = 0;

  let confirmedTotal = 0;
  let pendingTotal = 0;
  let pendingCount = 0;

  // 1. Process BOM components
  bomComponents.forEach((comp) => {
    const { totalCost } = calculateBomComponentCost(comp, finishedQty, masterMaterials);

    if (comp.category === 'raw_materials' || comp.category === 'ingredients') {
      rawMaterialsTotal += totalCost;
    } else if (comp.category === 'packaging' || comp.category === 'accessories') {
      packagingTotal += totalCost;
    } else {
      otherBomTotal += totalCost;
    }

    if (comp.status === 'confirmed') {
      confirmedTotal += totalCost;
    } else {
      pendingTotal += totalCost;
      pendingCount++;
    }
  });

  // 2. Process Labor & Services
  let laborTotal = 0;
  laborStages.forEach((stage) => {
    const { totalCost } = calculateLaborStageCost(stage, finishedQty);
    laborTotal += totalCost;

    if (stage.status === 'confirmed') {
      confirmedTotal += totalCost;
    } else {
      pendingTotal += totalCost;
      pendingCount++;
    }
  });

  // 3. Process Overhead & Expenses
  let overheadIncludedTotal = 0;
  let overheadExcludedTotal = 0;
  const directCosts = rawMaterialsTotal + packagingTotal + laborTotal;

  overheadItems.forEach((item) => {
    const { totalCost } = calculateOverheadItemCost(item, finishedQty, {
      materials: rawMaterialsTotal + packagingTotal,
      labor: laborTotal,
      directCosts,
    });

    if (item.includeInHpp) {
      overheadIncludedTotal += totalCost;
    } else {
      overheadExcludedTotal += totalCost;
    }

    if (item.status === 'confirmed') {
      confirmedTotal += totalCost;
    } else {
      pendingTotal += totalCost;
      pendingCount++;
    }
  });

  const totalProductionCost =
    rawMaterialsTotal + packagingTotal + otherBomTotal + laborTotal + overheadIncludedTotal;

  const unitHpp = finishedQty > 0 ? totalProductionCost / finishedQty : 0;
  const unitHppExcludingIndirect =
    finishedQty > 0
      ? (rawMaterialsTotal + packagingTotal + otherBomTotal + laborTotal) / finishedQty
      : 0;

  const sizeOrWeight = variant.sizeWeightVolume || 0;
  const costPerMeasurementUnit =
    sizeOrWeight > 0 ? unitHpp / sizeOrWeight : unitHpp;

  // Breakdown array for visualizations
  const categoryBreakdown = [
    {
      category: 'Raw Materials',
      total: rawMaterialsTotal,
      percentage: totalProductionCost > 0 ? (rawMaterialsTotal / totalProductionCost) * 100 : 0,
    },
    {
      category: 'Packaging',
      total: packagingTotal,
      percentage: totalProductionCost > 0 ? (packagingTotal / totalProductionCost) * 100 : 0,
    },
    {
      category: 'Labor & Services',
      total: laborTotal,
      percentage: totalProductionCost > 0 ? (laborTotal / totalProductionCost) * 100 : 0,
    },
    {
      category: 'Overhead & Operations',
      total: overheadIncludedTotal,
      percentage: totalProductionCost > 0 ? (overheadIncludedTotal / totalProductionCost) * 100 : 0,
    },
    {
      category: 'Other Direct Expenses',
      total: otherBomTotal,
      percentage: totalProductionCost > 0 ? (otherBomTotal / totalProductionCost) * 100 : 0,
    },
  ];

  return {
    actualFinishedQuantity: finishedQty,
    rawMaterialsTotal,
    packagingTotal,
    laborTotal,
    overheadTotal: overheadIncludedTotal,
    otherExpensesTotal: otherBomTotal + overheadExcludedTotal,
    totalProductionCost,
    unitHpp,
    unitHppExcludingIndirect,
    costPerMeasurementUnit,
    confirmedTotal,
    pendingTotal,
    hasPendingCosts: pendingCount > 0,
    pendingCount,
    categoryBreakdown,
  };
}

/**
 * Calculates consolidated group summary and weighted average HPP.
 * Group Weighted Average HPP = Group Total Production Cost / Group Total Production Quantity.
 */
export function calculateGroupSummary(
  group: ProductGroup,
  productsInGroup: Array<{
    summary: CalculatedCostSummary;
  }>
): GroupSummary {
  let totalFinishedUnits = 0;
  let totalRawMaterialsCost = 0;
  let totalPackagingCost = 0;
  let totalLaborCost = 0;
  let totalOverheadCost = 0;
  let totalProductionCost = 0;

  productsInGroup.forEach(({ summary }) => {
    totalFinishedUnits += summary.actualFinishedQuantity;
    totalRawMaterialsCost += summary.rawMaterialsTotal;
    totalPackagingCost += summary.packagingTotal;
    totalLaborCost += summary.laborTotal;
    totalOverheadCost += summary.overheadTotal;
    totalProductionCost += summary.totalProductionCost;
  });

  const weightedAverageHpp =
    totalFinishedUnits > 0 ? totalProductionCost / totalFinishedUnits : 0;

  return {
    groupId: group.id,
    groupName: group.name,
    productCount: productsInGroup.length,
    totalFinishedUnits,
    totalRawMaterialsCost,
    totalPackagingCost,
    totalLaborCost,
    totalOverheadCost,
    totalProductionCost,
    weightedAverageHpp,
  };
}

/**
 * Simulates a What-If Scenario without modifying original records.
 */
export function simulateScenario(
  variant: ProductVariant,
  bomComponents: BomComponent[],
  laborStages: ProductionProcessStage[],
  overheadItems: OverheadItem[],
  scenario: Scenario,
  masterMaterials?: MasterMaterial[]
): CalculatedCostSummary {
  const simulatedVariant: ProductVariant = {
    ...variant,
    plannedQuantity: scenario.simulatedQuantity,
    actualQuantity: undefined, // calculate freshly from simulatedQuantity
    wastagePercentage: scenario.wastagePercentage ?? variant.wastagePercentage,
  };

  const matMultiplier = 1 + (scenario.materialPriceAdjustmentPercent || 0) / 100;
  const pkgMultiplier = 1 + (scenario.packagingPriceAdjustmentPercent || 0) / 100;
  const laborMultiplier = 1 + (scenario.laborAdjustmentPercent || 0) / 100;
  const overheadMultiplier = 1 + (scenario.overheadAdjustmentPercent || 0) / 100;

  const adjustedBom = bomComponents.map((comp) => {
    let multiplier = 1;
    if (comp.category === 'raw_materials' || comp.category === 'ingredients') {
      multiplier = matMultiplier;
    } else if (comp.category === 'packaging' || comp.category === 'accessories') {
      multiplier = pkgMultiplier;
    }
    return {
      ...comp,
      unitPrice: comp.unitPrice * multiplier,
    };
  });

  const adjustedLabor = laborStages.map((stage) => ({
    ...stage,
    rate: stage.rate * laborMultiplier,
  }));

  const adjustedOverhead = overheadItems.map((item) => ({
    ...item,
    amount: item.amount * overheadMultiplier,
  }));

  return calculateProductCostSummary(
    simulatedVariant,
    adjustedBom,
    adjustedLabor,
    adjustedOverhead,
    masterMaterials
  );
}
