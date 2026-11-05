import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Copy,
  Lock,
  FileSpreadsheet,
  FileText,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import {
  BomComponent,
  CostComponentCategory,
  CostStatus,
  LaborCostMethod,
  OverheadAllocationMethod,
  ProductVariant,
} from '../../types';
import {
  calculateBomComponentCost,
  calculateLaborStageCost,
  calculateOverheadItemCost,
  calculateProductCostSummary,
} from '../../engine/calculations';
import { formatCurrencyValue, generateCostingPdfReport } from '../../engine/exportPdf';
import { generateCostingExcelWorkbook } from '../../engine/exportExcel';
import { PURCHASE_UNITS, USAGE_UNITS } from '../../engine/unitConversions';

interface ProductWorkspaceProps {
  productId: string;
  variantId?: string | null;
  onOpenNewVariant: (productId: string) => void;
  onFinalizeBatch: (productId: string, variantId: string) => void;
}

export const ProductWorkspace: React.FC<ProductWorkspaceProps> = ({
  productId,
  variantId,
  onOpenNewVariant,
  onFinalizeBatch,
}) => {
  const store = useCostingStore();
  const [activeTab, setActiveTab] = useState<'bom' | 'expenses' | 'target'>('bom');

  const product = store.products.find((p) => p.id === productId);
  const productVariants = useMemo(
    () => store.variants.filter((v) => v.productId === productId),
    [store.variants, productId]
  );

  const activeVariant = useMemo(() => {
    if (variantId) {
      const found = productVariants.find((v) => v.id === variantId);
      if (found) return found;
    }
    return productVariants[0] || null;
  }, [productVariants, variantId]);

  // Components for this variant
  const variantBom = useMemo(
    () => store.bom.filter((b) => b.variantId === activeVariant?.id),
    [store.bom, activeVariant]
  );

  const variantLabor = useMemo(
    () => store.labor.filter((l) => l.variantId === activeVariant?.id),
    [store.labor, activeVariant]
  );

  const variantOverhead = useMemo(
    () => store.overhead.filter((o) => o.variantId === activeVariant?.id),
    [store.overhead, activeVariant]
  );

  // Real-time calculation summary
  const summary = useMemo(() => {
    if (!activeVariant) return null;
    return calculateProductCostSummary(
      activeVariant,
      variantBom,
      variantLabor,
      variantOverhead,
      store.materials
    );
  }, [activeVariant, variantBom, variantLabor, variantOverhead, store.materials]);

  if (!product || !activeVariant || !summary) {
    return (
      <div className="p-8 text-center text-slate-500">
        Product not found or has no variants.
      </div>
    );
  }

  // Target change helper
  const handleTargetChange = (field: keyof ProductVariant, val: number) => {
    costingActions.updateVariant(activeVariant.id, { [field]: val });
  };

  // Add BOM item
  const handleAddBomItem = (category: CostComponentCategory = 'raw_materials') => {
    costingActions.addBomComponent({
      variantId: activeVariant.id,
      name: category === 'packaging' ? 'Pouch / Packaging Box' : 'Raw Ingredient',
      category,
      materialId: null,
      usagePerProduct: category === 'packaging' ? 1 : 100,
      usageUnit: category === 'packaging' ? 'pcs' : 'g',
      purchasePrice: 0,
      purchaseUnit: category === 'packaging' ? 'pcs' : 'kg',
      quantityRequired: category === 'packaging' ? 1 : 100,
      unit: category === 'packaging' ? 'pcs' : 'g',
      unitPrice: 0,
      costBasis: 'per_finished_unit',
      status: 'confirmed',
    });
  };

  // Add Expense item
  const handleAddExpense = (isLabor = true) => {
    if (isLabor) {
      costingActions.addLaborStage({
        variantId: activeVariant.id,
        stageName: 'Production / Processing Labor',
        costMethod: 'per_unit',
        rate: 500,
        workerCount: 1,
        hoursWorked: 1,
        status: 'confirmed',
      });
    } else {
      costingActions.addOverheadItem({
        variantId: activeVariant.id,
        name: 'Operational Utility / Overhead',
        allocationMethod: 'cost_per_unit',
        amount: 300,
        isDirect: false,
        includeInHpp: true,
        status: 'confirmed',
      });
    }
  };

  const handleExportPdf = () => {
    generateCostingPdfReport({
      currency: store.currency,
      product,
      variant: activeVariant,
      allGroups: store.groups,
      bom: store.bom,
      labor: store.labor,
      overhead: store.overhead,
      materials: store.materials,
      exportType: 'single_product',
    });
  };

  const handleExportExcel = () => {
    generateCostingExcelWorkbook({
      currency: store.currency,
      groups: store.groups,
      materials: store.materials,
      products: [product],
      variants: [activeVariant],
      bom: variantBom,
      labor: variantLabor,
      overhead: variantOverhead,
      scenarios: store.scenarios.filter((s) => s.variantId === activeVariant.id),
    });
  };

  const group = product.groupId ? store.groups.find((g) => g.id === product.groupId) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 1. Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-medium">
                {product.code}
              </span>
              {group ? (
                <button
                  onClick={() => costingActions.openGroup(group.id)}
                  className="text-xs bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <span>{group.name}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              ) : (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded italic">
                  Ungrouped
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Category: <span className="font-medium text-slate-700">{product.category}</span>
              {product.description ? ` • ${product.description}` : ''}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFinalizeBatch(product.id, activeVariant.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              title="Lock prices and save finalized production batch"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize Batch</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-lg transition-colors"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-lg transition-colors"
              title="Download PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete product "${product.name}"?`)) {
                  costingActions.deleteProduct(product.id);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Variant Pills Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Package Size:
            </span>
            {productVariants.map((v) => {
              const isActive = v.id === activeVariant.id;
              return (
                <button
                  key={v.id}
                  onClick={() => costingActions.selectVariant(v.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {v.name} {v.sizeWeightVolume ? `(${v.sizeWeightVolume}${v.measurementUnit})` : ''}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onOpenNewVariant(product.id)}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Size / Variant</span>
          </button>
        </div>
      </div>

      {/* 2. Hero HPP Summary Card (Simple, bold, unmistakable) */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50 border border-sky-200/90 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Harga Pokok Produksi (HPP)</span>
                <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-semibold">
                  Per Finished Product
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {formatCurrencyValue(summary.unitHpp, store.currency)}
                <span className="text-xs font-semibold text-slate-500 ml-1.5">/ {activeVariant.measurementUnit || 'pcs'}</span>
              </div>
              {activeVariant.sizeWeightVolume && (
                <div className="text-[11px] text-sky-700 font-medium mt-0.5">
                  {formatCurrencyValue(summary.costPerMeasurementUnit, store.currency)} per {activeVariant.measurementUnit}
                </div>
              )}
            </div>

            <div className="h-12 w-px bg-slate-200 hidden md:block" />

            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Production Budget (Batch)
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {formatCurrencyValue(summary.totalProductionCost, store.currency)}
              </div>
              <div className="text-[11px] text-slate-500">
                For batch of <strong className="text-slate-800">{summary.actualFinishedQuantity.toLocaleString()}</strong> {activeVariant.measurementUnit || 'units'}
              </div>
            </div>
          </div>

          {/* Cost Breakdown Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
            <span className="bg-sky-50 border border-sky-200 text-sky-900 px-2 py-0.5 rounded font-medium">
              Materials: {formatCurrencyValue(summary.rawMaterialsCostPerUnit, store.currency)}
            </span>
            <span className="bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded font-medium">
              Packaging: {formatCurrencyValue(summary.packagingCostPerUnit, store.currency)}
            </span>
            {summary.laborCostPerUnit > 0 && (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-medium">
                Labor: {formatCurrencyValue(summary.laborCostPerUnit, store.currency)}
              </span>
            )}
            {summary.overheadCostPerUnit > 0 && (
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded font-medium">
                Overhead: {formatCurrencyValue(summary.overheadCostPerUnit, store.currency)}
              </span>
            )}
          </div>
        </div>

        {/* Batch Quantity Input (Defined once per product batch) */}
        <div className="bg-white border-2 border-sky-300 rounded-xl p-3 shadow-xs min-w-[210px]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Batch Quantity
            </label>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
              Produced Units
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={activeVariant.plannedQuantity || ''}
              onChange={(e) => handleTargetChange('plannedQuantity', parseFloat(e.target.value) || 0)}
              className="w-28 text-lg font-black text-slate-900 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:bg-white focus:border-sky-500 focus:outline-none"
            />
            <span className="text-xs text-slate-500 font-semibold">{activeVariant.measurementUnit || 'pcs'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Sets target batch. Automatically multiplies all material usage and budget totals.
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs (Clean & Focused) */}
      <div className="flex border-b border-slate-200 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('bom')}
          className={`py-2 px-4 border-b-2 transition-colors ${
            activeTab === 'bom'
              ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Materials & Packaging ({variantBom.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-2 px-4 border-b-2 transition-colors ${
            activeTab === 'expenses'
              ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Labor & Overhead ({variantLabor.length + variantOverhead.length})
        </button>
        <button
          onClick={() => setActiveTab('target')}
          className={`py-2 px-4 border-b-2 transition-colors ${
            activeTab === 'target'
              ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Yield & Wastage Settings
        </button>
      </div>

      {/* 4. Tab 1: Materials & Packaging (Clean Table) */}
      {activeTab === 'bom' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Bill of Materials & Packaging
              </span>
              <span className="text-[11px] text-slate-500">
                Input usage per finished product and purchase price in your supplier unit (e.g. Kg). System auto-converts to usage unit price.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddBomItem('raw_materials')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Raw Material</span>
              </button>
              <button
                onClick={() => handleAddBomItem('packaging')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Packaging</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-y border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Component / Material Name</th>
                  <th className="py-2.5 px-3">Usage per Product</th>
                  <th className="py-2.5 px-3">Purchase Price & Unit</th>
                  <th className="py-2.5 px-3 text-right">Cost per Product</th>
                  <th className="py-2.5 px-3 text-right">Total Batch Cost</th>
                  <th className="py-2.5 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {variantBom.map((comp) => {
                  const compCost = calculateBomComponentCost(
                    comp,
                    summary.actualFinishedQuantity,
                    store.materials
                  );

                  let formattedBatchQty = `${compCost.totalQuantityRequired.toLocaleString()} ${compCost.effectiveUsageUnit}`;
                  if (
                    (compCost.effectiveUsageUnit.toLowerCase() === 'g' ||
                      compCost.effectiveUsageUnit.toLowerCase() === 'gram') &&
                    compCost.totalQuantityRequired >= 1000
                  ) {
                    formattedBatchQty = `${(compCost.totalQuantityRequired / 1000).toLocaleString()} kg`;
                  } else if (
                    (compCost.effectiveUsageUnit.toLowerCase() === 'ml' ||
                      compCost.effectiveUsageUnit.toLowerCase() === 'milliliter') &&
                    compCost.totalQuantityRequired >= 1000
                  ) {
                    formattedBatchQty = `${(compCost.totalQuantityRequired / 1000).toLocaleString()} L`;
                  }

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Name, Category & Master link */}
                      <td className="py-3 px-3 align-top min-w-[200px]">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, { name: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 font-bold text-slate-900 text-xs"
                          placeholder="e.g. Organic Coconut Sugar"
                        />
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              comp.category === 'packaging'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-sky-50 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {comp.category === 'packaging' ? 'Packaging' : 'Raw Material'}
                          </span>
                          <select
                            value={comp.materialId || ''}
                            onChange={(e) => {
                              const newMatId = e.target.value || null;
                              if (newMatId) {
                                const mat = store.materials.find((m) => m.id === newMatId);
                                if (mat) {
                                  costingActions.updateBomComponent(comp.id, {
                                    materialId: newMatId,
                                    name: mat.name,
                                    purchasePrice: mat.purchasePrice,
                                    purchaseUnit: mat.purchaseUnit,
                                    usageUnit: mat.consumptionUnit,
                                    conversionFactor: mat.conversionFactor,
                                    unitPrice: mat.purchasePrice / mat.conversionFactor,
                                    unit: mat.consumptionUnit,
                                  });
                                  return;
                                }
                              }
                              costingActions.updateBomComponent(comp.id, { materialId: null });
                            }}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[130px] truncate"
                          >
                            <option value="">Manual / Custom</option>
                            {store.materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.purchaseUnit})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 2. Usage per Product */}
                      <td className="py-3 px-3 align-top min-w-[150px]">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={comp.usagePerProduct ?? comp.quantityRequired ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              costingActions.updateBomComponent(comp.id, {
                                usagePerProduct: val,
                                quantityRequired: val,
                              });
                            }}
                            className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono font-semibold text-xs focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={comp.usageUnit ?? comp.unit ?? 'pcs'}
                            onChange={(e) => {
                              const u = e.target.value;
                              costingActions.updateBomComponent(comp.id, {
                                usageUnit: u,
                                unit: u,
                              });
                            }}
                            placeholder="g / pcs"
                            className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-700 font-medium focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          per 1 finished product
                        </span>
                      </td>

                      {/* 3. Purchase Price & Purchase Unit */}
                      <td className="py-3 px-3 align-top min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Rp</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={comp.purchasePrice ?? comp.unitPrice ?? ''}
                            onChange={(e) => {
                              const pPrice = parseFloat(e.target.value) || 0;
                              costingActions.updateBomComponent(comp.id, {
                                purchasePrice: pPrice,
                              });
                            }}
                            className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono font-semibold text-xs focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                          <span className="text-[11px] text-slate-400">/</span>
                          <input
                            type="text"
                            value={comp.purchaseUnit ?? comp.unit ?? 'kg'}
                            onChange={(e) => {
                              const pUnit = e.target.value;
                              costingActions.updateBomComponent(comp.id, {
                                purchaseUnit: pUnit,
                              });
                            }}
                            placeholder="kg / pcs"
                            className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-700 font-medium focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                        {/* Auto-converted Unit Price note */}
                        <div className="text-[10px] text-sky-700 font-medium mt-0.5">
                          = {formatCurrencyValue(compCost.unitPrice, store.currency)} / {compCost.effectiveUsageUnit}
                        </div>
                      </td>

                      {/* 4. Cost per Product */}
                      <td className="py-3 px-3 align-top text-right min-w-[130px]">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrencyValue(compCost.costPerFinishedUnit, store.currency)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {(comp.usagePerProduct ?? comp.quantityRequired ?? 0)} {compCost.effectiveUsageUnit} × {formatCurrencyValue(compCost.unitPrice, store.currency)}
                        </div>
                      </td>

                      {/* 5. Total Batch Cost */}
                      <td className="py-3 px-3 align-top text-right min-w-[150px]">
                        <div className="font-black text-sky-800 text-sm">
                          {formatCurrencyValue(compCost.totalCost, store.currency)}
                        </div>
                        <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block mt-0.5">
                          Batch: {formattedBatchQty}
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3 px-2 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => costingActions.duplicateBomComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Duplicate item"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => costingActions.deleteBomComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {variantBom.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No materials or packaging added yet. Click &ldquo;+ Raw Material&rdquo; or &ldquo;+ Packaging&rdquo; above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotal row */}
          <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/60 p-3 rounded-lg">
            <div className="flex items-center gap-4 text-slate-600">
              <span>
                Raw Materials: <strong className="text-slate-900">{formatCurrencyValue(summary.rawMaterialsCostPerUnit, store.currency)}</strong> / unit ({formatCurrencyValue(summary.rawMaterialsTotal, store.currency)} batch)
              </span>
              <span>
                Packaging: <strong className="text-slate-900">{formatCurrencyValue(summary.packagingCostPerUnit, store.currency)}</strong> / unit ({formatCurrencyValue(summary.packagingTotal, store.currency)} batch)
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-600 font-medium mr-2">Total Materials & Packaging:</span>
              <span className="text-sm font-black text-slate-900">
                {formatCurrencyValue(summary.rawMaterialsCostPerUnit + summary.packagingCostPerUnit, store.currency)}
                <span className="text-xs font-semibold text-slate-500 ml-1">/ unit</span>
              </span>
              <span className="text-xs font-bold text-sky-800 ml-2">
                ({formatCurrencyValue(summary.rawMaterialsTotal + summary.packagingTotal, store.currency)} batch)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Labor & Overhead (Clean Table) */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Labor, Services & Operational Overhead
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddExpense(true)}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Labor Stage</span>
              </button>
              <button
                onClick={() => handleAddExpense(false)}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Overhead Expense</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                  <th className="py-2.5 px-3">Expense Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Calculation Method</th>
                  <th className="py-2.5 px-3 text-right">Rate / Cost</th>
                  <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                  <th className="py-2.5 px-3 text-right">Batch Total</th>
                  <th className="py-2.5 px-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Labor rows */}
                {variantLabor.map((stage) => {
                  const { costPerFinishedUnit, totalCost } = calculateLaborStageCost(
                    stage,
                    summary.actualFinishedQuantity
                  );

                  return (
                    <tr key={stage.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <input
                          type="text"
                          value={stage.stageName}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, { stageName: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                          Labor
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={stage.costMethod}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, {
                              costMethod: e.target.value as LaborCostMethod,
                            })
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700"
                        >
                          <option value="per_unit">Per Unit</option>
                          <option value="per_batch">Per Batch</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={stage.rate || ''}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, {
                              rate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatCurrencyValue(costPerFinishedUnit, store.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                        {formatCurrencyValue(totalCost, store.currency)}
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => costingActions.deleteLaborStage(stage.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Overhead rows */}
                {variantOverhead.map((ovh) => {
                  const { costPerFinishedUnit, totalCost } = calculateOverheadItemCost(
                    ovh,
                    summary.actualFinishedQuantity,
                    {
                      materials: summary.rawMaterialsTotal + summary.packagingTotal,
                      labor: summary.laborTotal,
                      directCosts:
                        summary.rawMaterialsTotal + summary.packagingTotal + summary.laborTotal,
                    }
                  );

                  return (
                    <tr key={ovh.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <input
                          type="text"
                          value={ovh.name}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(ovh.id, { name: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                          Overhead
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={ovh.allocationMethod}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(ovh.id, {
                              allocationMethod: e.target.value as OverheadAllocationMethod,
                            })
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700"
                        >
                          <option value="cost_per_unit">Cost Per Unit</option>
                          <option value="fixed_per_batch">Fixed Per Batch</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={ovh.amount || ''}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(ovh.id, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatCurrencyValue(costPerFinishedUnit, store.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-indigo-800">
                        {formatCurrencyValue(totalCost, store.currency)}
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => costingActions.deleteOverheadItem(ovh.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {variantLabor.length === 0 && variantOverhead.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No labor stages or overhead expenses added. Click &ldquo;+ Labor Stage&rdquo; or &ldquo;+ Overhead Expense&rdquo; above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 pt-3 flex justify-between text-xs text-slate-600 font-semibold px-2">
            <span>Total Labor & Overhead:</span>
            <span className="text-slate-900 font-bold">
              {formatCurrencyValue(summary.laborTotal + summary.overheadTotal, store.currency)}
            </span>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Target & Yield Settings */}
      {activeTab === 'target' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Batch Target, Output Yield & Wastage
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Planned Production Units</label>
              <input
                type="number"
                min="1"
                value={activeVariant.plannedQuantity}
                onChange={(e) => handleTargetChange('plannedQuantity', parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Production Yield (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={activeVariant.yieldPercentage ?? 100}
                onChange={(e) => handleTargetChange('yieldPercentage', parseFloat(e.target.value) || 100)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Material Wastage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={activeVariant.wastagePercentage ?? 0}
                onChange={(e) => handleTargetChange('wastagePercentage', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Defective Units</label>
              <input
                type="number"
                min="0"
                value={activeVariant.defectiveQuantity ?? 0}
                onChange={(e) => handleTargetChange('defectiveQuantity', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-900">Resulting Actual Finished Output:</span>
            <span className="text-base font-bold text-sky-950 font-mono">
              {summary.actualFinishedQuantity.toLocaleString()} {activeVariant.measurementUnit}
            </span>
          </div>
        </div>
      )}

      {/* 7. Clean Grand Total Footer */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-6 flex-wrap text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Materials</span>
            <span className="font-bold">
              {formatCurrencyValue(summary.rawMaterialsTotal + summary.packagingTotal, store.currency)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Labor</span>
            <span className="font-bold">{formatCurrencyValue(summary.laborTotal, store.currency)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Overhead</span>
            <span className="font-bold">{formatCurrencyValue(summary.overheadTotal, store.currency)}</span>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Production Cost</span>
            <span className="font-extrabold text-sm text-sky-300">
              {formatCurrencyValue(summary.totalProductionCost, store.currency)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onFinalizeBatch(product.id, activeVariant.id)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Save & Finalize Batch</span>
        </button>
      </div>
    </div>
  );
};
