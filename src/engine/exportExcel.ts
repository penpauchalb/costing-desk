import * as XLSX from 'xlsx';
import {
  BomComponent,
  CurrencyCode,
  MasterMaterial,
  OverheadItem,
  Product,
  ProductGroup,
  ProductionProcessStage,
  ProductVariant,
  Scenario,
} from '../types';
import {
  calculateBomComponentCost,
  calculateLaborStageCost,
  calculateOverheadItemCost,
  calculateProductCostSummary,
} from './calculations';

interface ExportDataPayload {
  currency: CurrencyCode;
  groups: ProductGroup[];
  materials: MasterMaterial[];
  products: Product[];
  variants: ProductVariant[];
  bom: BomComponent[];
  labor: ProductionProcessStage[];
  overhead: OverheadItem[];
  scenarios: Scenario[];
}

export function generateCostingExcelWorkbook(payload: ExportDataPayload): void {
  const {
    currency,
    groups,
    materials,
    products,
    variants,
    bom,
    labor,
    overhead,
    scenarios,
  } = payload;

  const wb = XLSX.utils.book_new();

  // Helper map for group lookup
  const groupMap = new Map<string, string>();
  groups.forEach((g) => groupMap.set(g.id, g.name));

  // Helper map for product lookup
  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  // --------------------------------------------------------------------------
  // SHEET 1: Consolidated Summary
  // --------------------------------------------------------------------------
  const summaryRows: Record<string, string | number>[] = [];
  let grandTotalUnits = 0;
  let grandTotalCost = 0;

  variants.forEach((v) => {
    const prod = productMap.get(v.productId);
    if (!prod) return;

    const groupName = prod.groupId ? groupMap.get(prod.groupId) || 'Unknown Group' : 'Ungrouped';
    const varBom = bom.filter((b) => b.variantId === v.id);
    const varLabor = labor.filter((l) => l.variantId === v.id);
    const varOverhead = overhead.filter((o) => o.variantId === v.id);

    const summary = calculateProductCostSummary(v, varBom, varLabor, varOverhead, materials);

    grandTotalUnits += summary.actualFinishedQuantity;
    grandTotalCost += summary.totalProductionCost;

    summaryRows.push({
      Group: groupName,
      'Product Name': prod.name,
      'Product Code': prod.code,
      Category: prod.category,
      Variant: v.name,
      SKU: v.sku,
      'Planned Qty': v.plannedQuantity,
      'Actual Finished Units': summary.actualFinishedQuantity,
      'Raw Materials Cost': Math.round(summary.rawMaterialsTotal),
      'Packaging Cost': Math.round(summary.packagingTotal),
      'Labor Cost': Math.round(summary.laborTotal),
      'Overhead Cost': Math.round(summary.overheadTotal),
      'Total Production Cost': Math.round(summary.totalProductionCost),
      [`HPP / Unit (${currency})`]: Math.round(summary.unitHpp),
      Status: summary.hasPendingCosts ? 'Pending Costs' : 'Confirmed',
    });
  });

  // Grand Total Row
  const weightedGrandHpp = grandTotalUnits > 0 ? Math.round(grandTotalCost / grandTotalUnits) : 0;
  summaryRows.push({
    Group: 'GRAND TOTAL / WEIGHTED AVG',
    'Product Name': '—',
    'Product Code': '—',
    Category: '—',
    Variant: '—',
    SKU: '—',
    'Planned Qty': '—',
    'Actual Finished Units': grandTotalUnits,
    'Raw Materials Cost': '—',
    'Packaging Cost': '—',
    'Labor Cost': '—',
    'Overhead Cost': '—',
    'Total Production Cost': Math.round(grandTotalCost),
    [`HPP / Unit (${currency})`]: weightedGrandHpp,
    Status: 'Consolidated',
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Consolidated Summary');

  // --------------------------------------------------------------------------
  // SHEET 2: Product Details & Cost Structure
  // --------------------------------------------------------------------------
  const detailsRows: Record<string, string | number>[] = [];
  variants.forEach((v) => {
    const prod = productMap.get(v.productId);
    if (!prod) return;
    const groupName = prod.groupId ? groupMap.get(prod.groupId) || 'Unknown Group' : 'Ungrouped';
    const varBom = bom.filter((b) => b.variantId === v.id);
    const varLabor = labor.filter((l) => l.variantId === v.id);
    const varOverhead = overhead.filter((o) => o.variantId === v.id);
    const summary = calculateProductCostSummary(v, varBom, varLabor, varOverhead, materials);

    detailsRows.push({
      'Product Name': prod.name,
      Code: prod.code,
      Group: groupName,
      Variant: v.name,
      SKU: v.sku,
      'Size/Weight': `${v.sizeWeightVolume || ''} ${v.measurementUnit}`.trim(),
      'Planned Qty': v.plannedQuantity,
      'Yield %': v.yieldPercentage,
      'Wastage %': v.wastagePercentage,
      Defects: v.defectiveQuantity,
      Rework: v.reworkQuantity,
      'Actual Finished Output': summary.actualFinishedQuantity,
      'Total Raw Materials': Math.round(summary.rawMaterialsTotal),
      'Total Packaging': Math.round(summary.packagingTotal),
      'Total Labor': Math.round(summary.laborTotal),
      'Total Overhead': Math.round(summary.overheadTotal),
      'Total Production Cost': Math.round(summary.totalProductionCost),
      'HPP Per Finished Unit': Math.round(summary.unitHpp),
      'Cost Per Size Unit': Math.round(summary.costPerMeasurementUnit),
      'Cost Status': summary.hasPendingCosts ? `Pending (${summary.pendingCount})` : 'All Confirmed',
    });
  });
  const wsDetails = XLSX.utils.json_to_sheet(detailsRows);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Product Details');

  // --------------------------------------------------------------------------
  // SHEET 3: Bill of Materials (BOM)
  // --------------------------------------------------------------------------
  const bomRows: Record<string, string | number>[] = [];
  bom.forEach((comp) => {
    const v = variants.find((variant) => variant.id === comp.variantId);
    const prod = v ? productMap.get(v.productId) : undefined;
    const mat = materials.find((m) => m.id === comp.materialId);

    const finishedQty = v ? v.actualQuantity || v.plannedQuantity : 100;
    const compCost = calculateBomComponentCost(comp, finishedQty, materials);
    const { costPerFinishedUnit, totalCost, totalQuantityRequired } = compCost;

    bomRows.push({
      Product: prod?.name || 'Unknown',
      Variant: v?.name || 'Unknown',
      'Cost Component': comp.name,
      Category: comp.category === 'packaging' ? 'Packaging' : 'Raw Material',
      'Linked Material': mat?.name || 'Custom / Unlinked',
      'Usage per Product': comp.usagePerProduct ?? comp.quantityRequired,
      'Usage Unit': compCost.effectiveUsageUnit,
      'Purchase Price': compCost.effectivePurchasePrice,
      'Purchase Unit': compCost.effectivePurchaseUnit,
      'Price per Usage Unit': Math.round(compCost.unitPrice * 100) / 100,
      'Cost per Product': Math.round(costPerFinishedUnit * 100) / 100,
      'Total Batch Usage Required': Math.round(totalQuantityRequired * 100) / 100,
      'Total Batch Cost': Math.round(totalCost),
      Status: comp.status,
      Notes: comp.notes || '',
    });
  });
  const wsBom = XLSX.utils.json_to_sheet(bomRows);
  XLSX.utils.book_append_sheet(wb, wsBom, 'Bill of Materials');

  // --------------------------------------------------------------------------
  // SHEET 4: Labor & Production Services
  // --------------------------------------------------------------------------
  const laborRows: Record<string, string | number>[] = [];
  labor.forEach((stg) => {
    const v = variants.find((variant) => variant.id === stg.variantId);
    const prod = v ? productMap.get(v.productId) : undefined;
    const finishedQty = v ? v.actualQuantity || v.plannedQuantity : 100;
    const { costPerFinishedUnit, totalCost } = calculateLaborStageCost(stg, finishedQty);

    laborRows.push({
      Product: prod?.name || 'Unknown',
      Variant: v?.name || 'Unknown',
      'Stage / Service': stg.stageName,
      'Cost Method': stg.costMethod,
      'Rate / Cost': stg.rate,
      Workers: stg.workerCount || 1,
      Hours: stg.hoursWorked || 1,
      'Cost Per Finished Unit': Math.round(costPerFinishedUnit * 100) / 100,
      'Total Stage Cost': Math.round(totalCost),
      Status: stg.status,
      Notes: stg.notes || '',
    });
  });
  const wsLabor = XLSX.utils.json_to_sheet(laborRows);
  XLSX.utils.book_append_sheet(wb, wsLabor, 'Labor & Services');

  // --------------------------------------------------------------------------
  // SHEET 5: Overhead & Operational Expenses
  // --------------------------------------------------------------------------
  const overheadRows: Record<string, string | number>[] = [];
  overhead.forEach((ovh) => {
    const v = variants.find((variant) => variant.id === ovh.variantId);
    const prod = v ? productMap.get(v.productId) : undefined;
    const finishedQty = v ? v.actualQuantity || v.plannedQuantity : 100;

    const { costPerFinishedUnit, totalCost } = calculateOverheadItemCost(ovh, finishedQty, {
      materials: 1000000,
      labor: 500000,
      directCosts: 1500000,
    });

    overheadRows.push({
      Product: prod?.name || 'Unknown',
      Variant: v?.name || 'Unknown',
      'Expense Name': ovh.name,
      'Allocation Method': ovh.allocationMethod,
      Amount: ovh.amount,
      'Cost Nature': ovh.isDirect ? 'Direct' : 'Indirect',
      'Included in HPP': ovh.includeInHpp ? 'Yes' : 'No (Separate)',
      'Cost Per Finished Unit': Math.round(costPerFinishedUnit * 100) / 100,
      'Total Expense': Math.round(totalCost),
      Status: ovh.status,
      Notes: ovh.notes || '',
    });
  });
  const wsOverhead = XLSX.utils.json_to_sheet(overheadRows);
  XLSX.utils.book_append_sheet(wb, wsOverhead, 'Overhead');

  // --------------------------------------------------------------------------
  // SHEET 6: Master Materials Database
  // --------------------------------------------------------------------------
  const materialRows = materials.map((m) => ({
    'Material Name': m.name,
    Category: m.category,
    'Purchase Unit': m.purchaseUnit,
    [`Purchase Price (${currency})`]: m.purchasePrice,
    'Consumption Unit': m.consumptionUnit,
    'Conversion Factor': m.conversionFactor,
    [`Cost per ${m.consumptionUnit}`]: Math.round((m.purchasePrice / m.conversionFactor) * 100) / 100,
    Supplier: m.supplier || '',
    Notes: m.notes || '',
    'Last Updated': m.lastUpdated,
  }));
  const wsMaterials = XLSX.utils.json_to_sheet(materialRows);
  XLSX.utils.book_append_sheet(wb, wsMaterials, 'Master Materials');

  // --------------------------------------------------------------------------
  // SHEET 7: Scenario Comparison (when applicable)
  // --------------------------------------------------------------------------
  if (scenarios.length > 0) {
    const scenarioRows: Record<string, string | number>[] = [];
    scenarios.forEach((scen) => {
      const v = variants.find((variant) => variant.id === scen.variantId);
      const prod = v ? productMap.get(v.productId) : undefined;

      scenarioRows.push({
        'Scenario Name': scen.name,
        Product: prod?.name || 'Unknown',
        Variant: v?.name || 'Unknown',
        'Simulated Quantity': scen.simulatedQuantity,
        'Material Price Adj %': `${scen.materialPriceAdjustmentPercent}%`,
        'Packaging Price Adj %': `${scen.packagingPriceAdjustmentPercent}%`,
        'Labor Adj %': `${scen.laborAdjustmentPercent}%`,
        'Overhead Adj %': `${scen.overheadAdjustmentPercent}%`,
        'Wastage %': `${scen.wastagePercentage}%`,
        Notes: scen.notes || '',
      });
    });
    const wsScenarios = XLSX.utils.json_to_sheet(scenarioRows);
    XLSX.utils.book_append_sheet(wb, wsScenarios, 'Scenario Comparison');
  }

  // Trigger browser download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `CostingDesk_Report_${dateStr}.xlsx`);
}
