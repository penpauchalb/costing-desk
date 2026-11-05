import { describe, it, expect } from 'vitest';
import {
  calculateBomComponentCost,
  calculateProductCostSummary,
  calculateGroupSummary,
} from '../calculations';
import { calculateCostPerConsumptionUnit } from '../unitConversions';
import {
  BomComponent,
  MasterMaterial,
  ProductGroup,
  ProductVariant,
  ProductionBatch,
} from '../../types';

describe('HPP Engine Tests - Prompt Validation', () => {
  // Master material used in Test A & B
  const sugarMasterMaterial: MasterMaterial = {
    id: 'mat-sugar',
    name: 'Sugar',
    category: 'Ingredients',
    purchaseUnit: 'kg',
    purchasePrice: 29000,
    consumptionUnit: 'gram',
    conversionFactor: 1000,
    lastUpdated: '2026-11-05T00:00:00Z',
  };

  it('TEST A — Weight-based product (250g, 500 units)', () => {
    // Material price: Rp29,000/kg.
    // Net weight: 250 grams.
    // Production quantity: 500 units.
    const unitPricePerGram = calculateCostPerConsumptionUnit(
      sugarMasterMaterial.purchasePrice,
      sugarMasterMaterial.conversionFactor
    );
    expect(unitPricePerGram).toBe(29); // 29,000 / 1000 = Rp29/g

    const bomItem: BomComponent = {
      id: 'bom-1',
      variantId: 'var-250',
      name: 'Sugar',
      category: 'raw_materials',
      materialId: 'mat-sugar',
      quantityRequired: 250, // 250 grams per unit
      unit: 'gram',
      unitPrice: unitPricePerGram,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    };

    const variant: ProductVariant = {
      id: 'var-250',
      productId: 'prod-a',
      name: 'Product A 250g',
      sku: 'SKU-A-250',
      sizeWeightVolume: 250,
      measurementUnit: 'g',
      plannedQuantity: 500,
      actualQuantity: 500,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: '',
      updatedAt: '',
    };

    const compCost = calculateBomComponentCost(bomItem, 500, [sugarMasterMaterial]);
    expect(compCost.totalQuantityRequired).toBe(125000); // 125,000 grams = 125 kg
    expect(compCost.totalQuantityRequired / 1000).toBe(125); // 125 kg
    expect(compCost.costPerFinishedUnit).toBe(7250); // Rp7,250
    expect(compCost.totalCost).toBe(3625000); // Rp3,625,000

    const summary = calculateProductCostSummary(variant, [bomItem], [], [], [sugarMasterMaterial]);
    expect(summary.actualFinishedQuantity).toBe(500);
    expect(summary.rawMaterialsTotal).toBe(3625000);
    expect(summary.unitHpp).toBe(7250);
  });

  it('TEST B — Different package size (500g, 500 units)', () => {
    // Material price: Rp29,000/kg.
    // Net weight: 500 grams.
    // Production quantity: 500 units.
    const unitPricePerGram = calculateCostPerConsumptionUnit(
      sugarMasterMaterial.purchasePrice,
      sugarMasterMaterial.conversionFactor
    );

    const bomItem: BomComponent = {
      id: 'bom-2',
      variantId: 'var-500',
      name: 'Sugar',
      category: 'raw_materials',
      materialId: 'mat-sugar',
      quantityRequired: 500, // 500 grams per unit
      unit: 'gram',
      unitPrice: unitPricePerGram,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    };

    const variant: ProductVariant = {
      id: 'var-500',
      productId: 'prod-a',
      name: 'Product A 500g',
      sku: 'SKU-A-500',
      sizeWeightVolume: 500,
      measurementUnit: 'g',
      plannedQuantity: 500,
      actualQuantity: 500,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: '',
      updatedAt: '',
    };

    const compCost = calculateBomComponentCost(bomItem, 500, [sugarMasterMaterial]);
    expect(compCost.totalQuantityRequired / 1000).toBe(250); // 250 kg
    expect(compCost.costPerFinishedUnit).toBe(14500); // Rp14,500
    expect(compCost.totalCost).toBe(7250000); // Rp7,250,000

    const summary = calculateProductCostSummary(variant, [bomItem], [], [], [sugarMasterMaterial]);
    expect(summary.actualFinishedQuantity).toBe(500);
    expect(summary.rawMaterialsTotal).toBe(7250000);
    expect(summary.unitHpp).toBe(14500);
  });

  it('TEST C — Meter-based product (2 meters, Rp15,000/meter, 100 units)', () => {
    // Fabric consumption: 2 meters per unit.
    // Fabric price: Rp15,000/meter.
    // Production quantity: 100 units.
    const fabricMaterial: MasterMaterial = {
      id: 'mat-fabric',
      name: 'Cotton Fabric',
      category: 'Textiles',
      purchaseUnit: 'meter',
      purchasePrice: 15000,
      consumptionUnit: 'meter',
      conversionFactor: 1,
      lastUpdated: '2026-11-05T00:00:00Z',
    };

    const bomItem: BomComponent = {
      id: 'bom-fabric',
      variantId: 'var-shirt',
      name: 'Cotton Fabric',
      category: 'raw_materials',
      materialId: 'mat-fabric',
      quantityRequired: 2, // 2 meters per unit
      unit: 'meter',
      unitPrice: 15000,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    };

    const variant: ProductVariant = {
      id: 'var-shirt',
      productId: 'prod-shirt',
      name: 'Cotton Shirt',
      sku: 'SKU-SHIRT',
      measurementUnit: 'pcs',
      plannedQuantity: 100,
      actualQuantity: 100,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: '',
      updatedAt: '',
    };

    const compCost = calculateBomComponentCost(bomItem, 100, [fabricMaterial]);
    expect(compCost.totalQuantityRequired).toBe(200); // 200 meters
    expect(compCost.costPerFinishedUnit).toBe(30000); // 2 * 15,000 = Rp30,000
    expect(compCost.totalCost).toBe(3000000); // Rp3,000,000
  });

  it('TEST D — Multiple products in one group (Weighted Average HPP)', () => {
    // Group with two products:
    // Product 1: 500 units @ Rp7,250 = Rp3,625,000
    // Product 2: 500 units @ Rp14,500 = Rp7,250,000
    // Total production quantity: 1000 units
    // Total production cost: Rp10,875,000
    // Weighted average HPP: 10,875,000 / 1000 = Rp10,875
    const group: ProductGroup = {
      id: 'group-1',
      name: 'Product Line A',
      orderIndex: 0,
      createdAt: '',
      updatedAt: '',
    };

    const summary1 = {
      actualFinishedQuantity: 500,
      rawMaterialsTotal: 3625000,
      packagingTotal: 0,
      laborTotal: 0,
      overheadTotal: 0,
      otherExpensesTotal: 0,
      rawMaterialsCostPerUnit: 7250,
      packagingCostPerUnit: 0,
      laborCostPerUnit: 0,
      overheadCostPerUnit: 0,
      totalProductionCost: 3625000,
      unitHpp: 7250,
      unitHppExcludingIndirect: 7250,
      costPerMeasurementUnit: 29,
      confirmedTotal: 3625000,
      pendingTotal: 0,
      hasPendingCosts: false,
      pendingCount: 0,
      categoryBreakdown: [],
    };

    const summary2 = {
      actualFinishedQuantity: 500,
      rawMaterialsTotal: 7250000,
      packagingTotal: 0,
      laborTotal: 0,
      overheadTotal: 0,
      otherExpensesTotal: 0,
      rawMaterialsCostPerUnit: 14500,
      packagingCostPerUnit: 0,
      laborCostPerUnit: 0,
      overheadCostPerUnit: 0,
      totalProductionCost: 7250000,
      unitHpp: 14500,
      unitHppExcludingIndirect: 14500,
      costPerMeasurementUnit: 29,
      confirmedTotal: 7250000,
      pendingTotal: 0,
      hasPendingCosts: false,
      pendingCount: 0,
      categoryBreakdown: [],
    };

    const groupSummary = calculateGroupSummary(group, [
      { summary: summary1 },
      { summary: summary2 },
    ]);

    expect(groupSummary.totalFinishedUnits).toBe(1000);
    expect(groupSummary.totalProductionCost).toBe(10875000);
    expect(groupSummary.weightedAverageHpp).toBe(10875);
  });

  it('TEST E — Ungrouped product independence', () => {
    // Ungrouped product has groupId: null
    // It should calculate completely independently without any group assignment
    const variant: ProductVariant = {
      id: 'var-solo',
      productId: 'prod-solo',
      name: 'Solo Item',
      sku: 'SOLO-01',
      measurementUnit: 'pcs',
      plannedQuantity: 50,
      actualQuantity: 50,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: '',
      updatedAt: '',
    };

    const bomItem: BomComponent = {
      id: 'bom-solo',
      variantId: 'var-solo',
      name: 'Component X',
      category: 'raw_materials',
      quantityRequired: 1,
      unit: 'pcs',
      unitPrice: 5000,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    };

    const summary = calculateProductCostSummary(variant, [bomItem], [], []);
    expect(summary.totalProductionCost).toBe(250000);
    expect(summary.unitHpp).toBe(5000);
  });

  it('TEST F — Historical material price snapshot preservation', () => {
    // 1. Create a finalized batch using a material price of Rp29,000/kg
    const originalPrice = 29000;
    const batch: ProductionBatch = {
      id: 'batch-2026-001',
      batchNumber: 'B-001',
      productId: 'prod-a',
      variantId: 'var-250',
      productName: 'Product A',
      variantName: '250g',
      plannedQuantity: 500,
      actualFinishedQuantity: 500,
      status: 'finalized',
      finalizedAt: '2026-11-01T10:00:00Z',
      priceSnapshots: [
        {
          materialId: 'mat-sugar',
          materialName: 'Sugar',
          purchasePrice: originalPrice,
          purchaseUnit: 'kg',
          unitPriceUsed: 29, // 29,000 / 1000
          consumptionUnit: 'gram',
        },
      ],
      totalProductionCost: 3625000,
      unitHpp: 7250,
      createdAt: '2026-11-01T08:00:00Z',
    };

    // 2. Change master material price to Rp31,000/kg
    const updatedMasterMaterial: MasterMaterial = {
      ...sugarMasterMaterial,
      purchasePrice: 31000,
      lastUpdated: '2026-11-05T12:00:00Z',
    };

    // 3. Verify finalized batch retains its historical price snapshot of Rp29,000/kg
    expect(batch.priceSnapshots[0].purchasePrice).toBe(29000);
    expect(batch.priceSnapshots[0].unitPriceUsed).toBe(29);
    expect(batch.totalProductionCost).toBe(3625000);
    expect(batch.unitHpp).toBe(7250);
    expect(updatedMasterMaterial.purchasePrice).toBe(31000);
  });

  it('TEST G — User Revision Scenario: Trovia Core 250g (Batch 500 pcs, Kg-to-Gram auto-conversion)', () => {
    // Requirements from revision prompt:
    // Batch Quantity: 500 pcs
    // Coconut sugar: Rp29,000/Kg, Usage per product: 250g
    // System auto-converts: Rp29,000 / 1000 = Rp29/g
    // Cost per product: 250 * 29 = Rp7,250
    // Total batch cost: 7,250 * 500 = Rp3,625,000
    // Total batch material needed: 250 * 500 = 125,000g = 125 kg
    // Packaging pouch: Rp5,500/pcs, Usage: 1 pcs
    // Cost per product: Rp5,500, Total batch: Rp2,750,000
    // Total HPP per product = 7,250 + 5,500 = Rp12,750
    // Total Batch Production Budget = Rp6,375,000

    const coconutSugar: BomComponent = {
      id: 'bom-trovia-sugar',
      variantId: 'var-trovia-250',
      name: 'Organic Coconut Sugar',
      category: 'raw_materials',
      usagePerProduct: 250,
      usageUnit: 'g',
      purchasePrice: 29000,
      purchaseUnit: 'kg',
      quantityRequired: 250,
      unit: 'g',
      unitPrice: 29,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    };

    const packagingPouch: BomComponent = {
      id: 'bom-trovia-pouch',
      variantId: 'var-trovia-250',
      name: 'Standing Kraft Pouch 250g',
      category: 'packaging',
      usagePerProduct: 1,
      usageUnit: 'pcs',
      purchasePrice: 5500,
      purchaseUnit: 'pcs',
      quantityRequired: 1,
      unit: 'pcs',
      unitPrice: 5500,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    };

    const variant: ProductVariant = {
      id: 'var-trovia-250',
      productId: 'prod-trovia-core',
      name: '250g Pouch',
      sku: 'TRV-COR-250',
      sizeWeightVolume: 250,
      measurementUnit: 'g',
      plannedQuantity: 500,
      actualQuantity: 500,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: '',
      updatedAt: '',
    };

    const sugarCost = calculateBomComponentCost(coconutSugar, 500);
    expect(sugarCost.unitPrice).toBe(29);
    expect(sugarCost.costPerFinishedUnit).toBe(7250);
    expect(sugarCost.totalCost).toBe(3625000);
    expect(sugarCost.totalQuantityRequired).toBe(125000); // 125 kg

    const pouchCost = calculateBomComponentCost(packagingPouch, 500);
    expect(pouchCost.costPerFinishedUnit).toBe(5500);
    expect(pouchCost.totalCost).toBe(2750000);

    const summary = calculateProductCostSummary(variant, [coconutSugar, packagingPouch], [], []);
    expect(summary.rawMaterialsCostPerUnit).toBe(7250);
    expect(summary.packagingCostPerUnit).toBe(5500);
    expect(summary.unitHpp).toBe(12750); // Rp12,750 per product
    expect(summary.totalProductionCost).toBe(6375000); // Rp6,375,000 total batch budget
  });
});
