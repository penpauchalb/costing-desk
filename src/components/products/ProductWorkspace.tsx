import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  FileSpreadsheet,
  FileText,
  Sliders,
  DollarSign,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import {
  BomComponent,
  CostComponentCategory,
  CostStatus,
  LaborCostMethod,
  OverheadAllocationMethod,
  OverheadItem,
  ProductionProcessStage,
  ProductVariant,
} from '../../types';
import {
  calculateActualFinishedQuantity,
  calculateBomComponentCost,
  calculateLaborStageCost,
  calculateOverheadItemCost,
  calculateProductCostSummary,
} from '../../engine/calculations';
import { formatCurrencyValue, generateCostingPdfReport } from '../../engine/exportPdf';
import { generateCostingExcelWorkbook } from '../../engine/exportExcel';

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

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    target: true,
    bom: true,
    labor: true,
    overhead: true,
    summary: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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

  // --- Handlers for Variant Target ---
  const handleTargetChange = (field: keyof ProductVariant, val: number) => {
    costingActions.updateVariant(activeVariant.id, { [field]: val });
  };

  // --- Handlers for BOM ---
  const handleAddBomItem = (category: CostComponentCategory = 'raw_materials') => {
    costingActions.addBomComponent({
      variantId: activeVariant.id,
      name: category === 'packaging' ? 'New Packaging Item' : 'New Raw Material',
      category,
      materialId: null,
      quantityRequired: 1,
      unit: 'pcs',
      unitPrice: 0,
      costBasis: 'per_finished_unit',
      status: 'pending',
    });
  };

  // --- Handlers for Labor ---
  const handleAddLaborStage = () => {
    costingActions.addLaborStage({
      variantId: activeVariant.id,
      stageName: 'New Processing Stage',
      costMethod: 'per_unit',
      rate: 0,
      workerCount: 1,
      hoursWorked: 1,
      status: 'confirmed',
    });
  };

  // --- Handlers for Overhead ---
  const handleAddOverheadItem = () => {
    costingActions.addOverheadItem({
      variantId: activeVariant.id,
      name: 'Utility / Electricity',
      allocationMethod: 'cost_per_unit',
      amount: 0,
      isDirect: false,
      includeInHpp: true,
      status: 'confirmed',
    });
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Product Header & Variant Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 flex-shrink-0 mt-0.5">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {product.code}
                </span>
                {group ? (
                  <button
                    onClick={() => costingActions.openGroup(group.id)}
                    className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
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
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onFinalizeBatch(product.id, activeVariant.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
              title="Lock prices and save an immutable production batch snapshot"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize Batch</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded transition-colors"
              title="Export this product to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded transition-colors"
              title="Export this product to PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => costingActions.duplicateProduct(product.id)}
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded"
              title="Duplicate product"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete product "${product.name}" and all its variants?`)) {
                  costingActions.deleteProduct(product.id);
                }
              }}
              className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded"
              title="Delete product"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Variant Tabs Bar */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Variants:
            </span>
            {productVariants.map((v) => {
              const isActive = v.id === activeVariant.id;
              return (
                <button
                  key={v.id}
                  onClick={() => costingActions.selectVariant(v.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{v.name}</span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {v.sizeWeightVolume ? `${v.sizeWeightVolume}${v.measurementUnit}` : v.sku}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onOpenNewVariant(product.id)}
            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium px-2 py-1 rounded hover:bg-sky-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky HPP Highlight Strip */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
              Calculated HPP / Unit
            </div>
            <div className="text-2xl font-black text-sky-950">
              {formatCurrencyValue(summary.unitHpp, store.currency)}
            </div>
          </div>

          <div className="h-8 w-px bg-sky-200 hidden sm:block" />

          <div>
            <div className="text-[10px] font-medium text-sky-700 uppercase">Total Batch Budget</div>
            <div className="text-sm font-bold text-slate-900">
              {formatCurrencyValue(summary.totalProductionCost, store.currency)}
            </div>
          </div>

          <div className="h-8 w-px bg-sky-200 hidden sm:block" />

          <div>
            <div className="text-[10px] font-medium text-sky-700 uppercase">Actual Finished Output</div>
            <div className="text-sm font-bold text-slate-900">
              {summary.actualFinishedQuantity.toLocaleString()} {activeVariant.measurementUnit}
            </div>
          </div>

          {activeVariant.sizeWeightVolume && (
            <>
              <div className="h-8 w-px bg-sky-200 hidden sm:block" />
              <div>
                <div className="text-[10px] font-medium text-sky-700 uppercase">
                  Cost per {activeVariant.measurementUnit}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {formatCurrencyValue(summary.costPerMeasurementUnit, store.currency)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cost Completeness Pill */}
        <div className="flex items-center gap-2">
          {summary.hasPendingCosts ? (
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{summary.pendingCount} Pending Costs</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>All Costs Confirmed</span>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: PRODUCTION TARGET & YIELD ENGINE */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('target')}
          className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-200 hover:bg-slate-100/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Production Target, Wastage & Output Yield
            </span>
          </div>
          {openSections.target ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {openSections.target && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                Planned Units
              </label>
              <input
                type="number"
                min="1"
                value={activeVariant.plannedQuantity || ''}
                onChange={(e) => handleTargetChange('plannedQuantity', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                Yield Target (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={activeVariant.yieldPercentage ?? 100}
                onChange={(e) => handleTargetChange('yieldPercentage', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                Wastage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={activeVariant.wastagePercentage ?? 0}
                onChange={(e) => handleTargetChange('wastagePercentage', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                Defective Units
              </label>
              <input
                type="number"
                min="0"
                value={activeVariant.defectiveQuantity ?? 0}
                onChange={(e) => handleTargetChange('defectiveQuantity', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                Reworked Units
              </label>
              <input
                type="number"
                min="0"
                value={activeVariant.reworkQuantity ?? 0}
                onChange={(e) => handleTargetChange('reworkQuantity', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div className="bg-sky-50/70 border border-sky-100 rounded p-2">
              <span className="block text-sky-700 text-[10px] font-bold uppercase">
                Actual Finished Output
              </span>
              <span className="text-base font-bold text-sky-900">
                {summary.actualFinishedQuantity.toLocaleString()} {activeVariant.measurementUnit}
              </span>
              <p className="text-[10px] text-sky-600 mt-0.5">Basis for HPP calculation</p>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: FLEXIBLE BILL OF MATERIALS (BOM) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
          <button
            onClick={() => toggleSection('bom')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Flexible Bill of Materials (BOM) & Components
            </span>
            {openSections.bom ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAddBomItem('raw_materials')}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded transition-colors"
            >
              <Plus className="w-3 h-3 text-sky-600" />
              <span>+ Raw Material</span>
            </button>
            <button
              onClick={() => handleAddBomItem('packaging')}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded transition-colors"
            >
              <Plus className="w-3 h-3 text-amber-600" />
              <span>+ Packaging</span>
            </button>
          </div>
        </div>

        {openSections.bom && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-medium">
                  <th className="py-2.5 px-3">Component Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Master Material Link</th>
                  <th className="py-2.5 px-3 text-right">Consumption</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                  <th className="py-2.5 px-3 text-right">Total Batch Cost</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {variantBom.map((comp) => {
                  const { costPerFinishedUnit, totalCost } = calculateBomComponentCost(
                    comp,
                    summary.actualFinishedQuantity,
                    store.materials
                  );

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-2.5 px-3 font-medium">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, { name: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 text-slate-900 font-medium"
                        />
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <select
                          value={comp.category}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, {
                              category: e.target.value as CostComponentCategory,
                            })
                          }
                          className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 text-[11px] focus:outline-none"
                        >
                          <option value="raw_materials">Raw Materials</option>
                          <option value="ingredients">Ingredients</option>
                          <option value="packaging">Packaging</option>
                          <option value="accessories">Accessories</option>
                          <option value="consumables">Consumables</option>
                          <option value="other">Other</option>
                        </select>
                      </td>

                      {/* Link to Master Material */}
                      <td className="py-2.5 px-3">
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
                                  unit: mat.consumptionUnit,
                                  unitPrice: mat.purchasePrice / mat.conversionFactor,
                                  status: 'confirmed',
                                });
                                return;
                              }
                            }
                            costingActions.updateBomComponent(comp.id, { materialId: null });
                          }}
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[130px] truncate"
                        >
                          <option value="">Custom / Manual</option>
                          {store.materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.consumptionUnit})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity Required */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={comp.quantityRequired || ''}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, {
                              quantityRequired: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={comp.unit}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, { unit: e.target.value })
                          }
                          className="w-14 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 text-xs py-0.5 focus:outline-none"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={comp.unitPrice || ''}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, {
                              unitPrice: parseFloat(e.target.value) || 0,
                              status: 'confirmed',
                            })
                          }
                          className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </td>

                      {/* Cost per unit */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatCurrencyValue(costPerFinishedUnit, store.currency)}
                      </td>

                      {/* Total Cost */}
                      <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                        {formatCurrencyValue(totalCost, store.currency)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={comp.status}
                          onChange={(e) =>
                            costingActions.updateBomComponent(comp.id, {
                              status: e.target.value as CostStatus,
                            })
                          }
                          className={`text-[10px] font-medium rounded px-1.5 py-0.5 border ${
                            comp.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="pending">Pending</option>
                          <option value="blank">Blank</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => costingActions.duplicateBomComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => costingActions.deleteBomComponent(comp.id)}
                            className="p-1 text-rose-400 hover:text-rose-600 rounded"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {variantBom.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      No components added yet. Add raw materials or packaging items above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: LABOR, PRODUCTION PROCESSES & SERVICES */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
          <button
            onClick={() => toggleSection('labor')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Labor, Production Process Stages & Services
            </span>
            {openSections.labor ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleAddLaborStage}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3 h-3 text-sky-600" />
            <span>+ Add Stage</span>
          </button>
        </div>

        {openSections.labor && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-medium">
                  <th className="py-2.5 px-3">Stage / Process Name</th>
                  <th className="py-2.5 px-3">Calculation Method</th>
                  <th className="py-2.5 px-3 text-right">Rate / Cost</th>
                  <th className="py-2.5 px-3 text-right">Workers</th>
                  <th className="py-2.5 px-3 text-right">Hours</th>
                  <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                  <th className="py-2.5 px-3 text-right">Total Stage Cost</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {variantLabor.map((stage) => {
                  const { costPerFinishedUnit, totalCost } = calculateLaborStageCost(
                    stage,
                    summary.actualFinishedQuantity
                  );

                  return (
                    <tr key={stage.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium">
                        <input
                          type="text"
                          value={stage.stageName}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, { stageName: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 text-slate-900"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={stage.costMethod}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, {
                              costMethod: e.target.value as LaborCostMethod,
                            })
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none"
                        >
                          <option value="per_unit">Per Unit</option>
                          <option value="per_batch">Per Batch</option>
                          <option value="per_hour">Per Hour</option>
                          <option value="per_worker">Per Worker</option>
                          <option value="fixed">Fixed Cost</option>
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
                          className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="1"
                          value={stage.workerCount || 1}
                          disabled={stage.costMethod !== 'per_worker'}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, {
                              workerCount: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-14 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs disabled:opacity-40"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          value={stage.hoursWorked || 1}
                          disabled={
                            stage.costMethod !== 'per_hour' && stage.costMethod !== 'per_worker'
                          }
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, {
                              hoursWorked: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-14 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs disabled:opacity-40"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatCurrencyValue(costPerFinishedUnit, store.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                        {formatCurrencyValue(totalCost, store.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={stage.status}
                          onChange={(e) =>
                            costingActions.updateLaborStage(stage.id, {
                              status: e.target.value as CostStatus,
                            })
                          }
                          className={`text-[10px] font-medium rounded px-1.5 py-0.5 border ${
                            stage.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="pending">Pending</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => costingActions.deleteLaborStage(stage.id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {variantLabor.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      No labor or processing stages added. Add custom stages (Mixing, Assembly, Packaging) above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 4: OVERHEAD & ADDITIONAL EXPENSES */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
          <button
            onClick={() => toggleSection('overhead')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Overhead, Utilities & Operational Expenses
            </span>
            {openSections.overhead ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleAddOverheadItem}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3 h-3 text-sky-600" />
            <span>+ Add Overhead</span>
          </button>
        </div>

        {openSections.overhead && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-medium">
                  <th className="py-2.5 px-3">Expense Name</th>
                  <th className="py-2.5 px-3">Allocation Method</th>
                  <th className="py-2.5 px-3 text-right">Amount / Rate</th>
                  <th className="py-2.5 px-3 text-center">Cost Nature</th>
                  <th className="py-2.5 px-3 text-center">Include in HPP</th>
                  <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                  <th className="py-2.5 px-3 text-right">Total Expense</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {variantOverhead.map((item) => {
                  const { costPerFinishedUnit, totalCost } = calculateOverheadItemCost(
                    item,
                    summary.actualFinishedQuantity,
                    {
                      materials: summary.rawMaterialsTotal + summary.packagingTotal,
                      labor: summary.laborTotal,
                      directCosts:
                        summary.rawMaterialsTotal + summary.packagingTotal + summary.laborTotal,
                    }
                  );

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(item.id, { name: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 text-slate-900"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={item.allocationMethod}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(item.id, {
                              allocationMethod: e.target.value as OverheadAllocationMethod,
                            })
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none"
                        >
                          <option value="cost_per_unit">Cost Per Unit</option>
                          <option value="fixed_per_batch">Fixed Per Batch</option>
                          <option value="percentage_allocation">% of Direct Costs</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.amount || ''}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(item.id, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-mono text-xs focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() =>
                            costingActions.updateOverheadItem(item.id, { isDirect: !item.isDirect })
                          }
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${
                            item.isDirect
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.isDirect ? 'Direct Cost' : 'Indirect Cost'}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.includeInHpp}
                          onChange={(e) =>
                            costingActions.updateOverheadItem(item.id, {
                              includeInHpp: e.target.checked,
                            })
                          }
                          className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatCurrencyValue(costPerFinishedUnit, store.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                        {formatCurrencyValue(totalCost, store.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => costingActions.deleteOverheadItem(item.id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {variantOverhead.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No overhead expenses added. Add electricity, depreciation, or rent allocation above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 5: FINAL HPP SUMMARY & CONFIRMATION BREAKDOWN */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Complete Cost Breakdown & HPP Synthesis
        </h2>

        {/* Visual Category Breakdown Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {summary.categoryBreakdown.map((item, idx) => (
              <div
                key={idx}
                style={{ width: `${item.percentage}%` }}
                className={`h-full transition-all ${
                  idx === 0
                    ? 'bg-sky-500'
                    : idx === 1
                    ? 'bg-amber-500'
                    : idx === 2
                    ? 'bg-emerald-500'
                    : idx === 3
                    ? 'bg-indigo-500'
                    : 'bg-slate-400'
                }`}
                title={`${item.category}: ${Math.round(item.percentage)}% (${formatCurrencyValue(item.total, store.currency)})`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Raw Materials: {formatCurrencyValue(summary.rawMaterialsTotal, store.currency)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Packaging: {formatCurrencyValue(summary.packagingTotal, store.currency)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Labor & Services: {formatCurrencyValue(summary.laborTotal, store.currency)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Overhead: {formatCurrencyValue(summary.overheadTotal, store.currency)}</span>
            </span>
          </div>
        </div>

        {/* Confirmed vs Pending Costs Summary Alert */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-400">Confirmed Subtotal: </span>
              <span className="font-bold text-emerald-700">
                {formatCurrencyValue(summary.confirmedTotal, store.currency)}
              </span>
            </div>
            {summary.pendingTotal > 0 && (
              <div>
                <span className="text-slate-400">Pending / Estimated Subtotal: </span>
                <span className="font-bold text-amber-700">
                  {formatCurrencyValue(summary.pendingTotal, store.currency)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => onFinalizeBatch(product.id, activeVariant.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white font-semibold rounded text-xs transition-colors shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Finalize & Record Batch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
