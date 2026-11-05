import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import {
  calculateProductCostSummary,
  simulateScenario,
} from '../../engine/calculations';
import { formatCurrencyValue } from '../../engine/exportPdf';
import { Scenario } from '../../types';

export const ScenarioCalculatorView: React.FC = () => {
  const store = useCostingStore();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    store.products[0]?.id || ''
  );

  const productVariants = useMemo(() => {
    return store.variants.filter((v) => v.productId === selectedProductId);
  }, [store.variants, selectedProductId]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    productVariants[0]?.id || ''
  );

  // Active base variant
  const activeVariant = useMemo(() => {
    return (
      productVariants.find((v) => v.id === selectedVariantId) ||
      productVariants[0] ||
      null
    );
  }, [productVariants, selectedVariantId]);

  // Base components
  const baseBom = useMemo(
    () => store.bom.filter((b) => b.variantId === activeVariant?.id),
    [store.bom, activeVariant]
  );
  const baseLabor = useMemo(
    () => store.labor.filter((l) => l.variantId === activeVariant?.id),
    [store.labor, activeVariant]
  );
  const baseOverhead = useMemo(
    () => store.overhead.filter((o) => o.variantId === activeVariant?.id),
    [store.overhead, activeVariant]
  );

  // Base summary
  const baseSummary = useMemo(() => {
    if (!activeVariant) return null;
    return calculateProductCostSummary(
      activeVariant,
      baseBom,
      baseLabor,
      baseOverhead,
      store.materials
    );
  }, [activeVariant, baseBom, baseLabor, baseOverhead, store.materials]);

  // Scenarios for this variant
  const variantScenarios = useMemo(() => {
    return store.scenarios.filter((s) => s.variantId === activeVariant?.id);
  }, [store.scenarios, activeVariant]);

  // Add new scenario for this variant
  const handleAddScenario = (qty = 1000) => {
    if (!activeVariant) return;
    costingActions.addScenario({
      productId: activeVariant.productId,
      variantId: activeVariant.id,
      name: `Scale Simulation (${qty.toLocaleString()} units)`,
      simulatedQuantity: qty,
      materialPriceAdjustmentPercent: 0,
      packagingPriceAdjustmentPercent: 0,
      laborAdjustmentPercent: 0,
      overheadAdjustmentPercent: 0,
      wastagePercentage: activeVariant.wastagePercentage || 0,
      notes: 'What-if sensitivity simulation',
    });
  };

  const selectedProduct = store.products.find((p) => p.id === selectedProductId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0 mt-0.5">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Scenario Calculator & What-If Simulator</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Simulate scale-ups, bulk ingredient price discounts, wage changes, and wastage variances side by side without altering original product calculations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddScenario(500)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Scenario</span>
          </button>
        </div>
      </div>

      {/* Product & Variant Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center gap-4 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Select Product:</span>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              const firstVar = store.variants.find((v) => v.productId === e.target.value);
              setSelectedVariantId(firstVar?.id || '');
            }}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {store.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Variant:</span>
          <select
            value={activeVariant?.id || ''}
            onChange={(e) => setSelectedVariantId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {productVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span>Non-destructive sandbox environment</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Container */}
      {activeVariant && baseSummary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Column 1: BASE RECORD */}
            <div className="bg-white border-2 border-slate-300 rounded-lg shadow-sm p-4 space-y-4">
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    BASE CALCULATION
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{activeVariant.name}</h3>
                </div>
              </div>

              {/* Base Parameters */}
              <div className="space-y-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Planned Quantity:</span>
                  <span className="font-bold text-slate-800">
                    {activeVariant.plannedQuantity.toLocaleString()} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Yield %:</span>
                  <span className="font-medium text-slate-800">{activeVariant.yieldPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wastage %:</span>
                  <span className="font-medium text-slate-800">{activeVariant.wastagePercentage}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Actual Finished:</span>
                  <span className="font-bold text-slate-900">
                    {baseSummary.actualFinishedQuantity.toLocaleString()} units
                  </span>
                </div>
              </div>

              {/* Base Results */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Base HPP / Unit
                  </span>
                  <div className="text-xl font-black text-slate-900">
                    {formatCurrencyValue(baseSummary.unitHpp, store.currency)}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span>Raw Materials:</span>
                    <span>{formatCurrencyValue(baseSummary.rawMaterialsTotal, store.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packaging:</span>
                    <span>{formatCurrencyValue(baseSummary.packagingTotal, store.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labor & Services:</span>
                    <span>{formatCurrencyValue(baseSummary.laborTotal, store.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overhead:</span>
                    <span>{formatCurrencyValue(baseSummary.overheadTotal, store.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                    <span>Total Production Cost:</span>
                    <span>{formatCurrencyValue(baseSummary.totalProductionCost, store.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Scenarios Columns */}
            {variantScenarios.map((scen) => {
              const simSummary = simulateScenario(
                activeVariant,
                baseBom,
                baseLabor,
                baseOverhead,
                scen,
                store.materials
              );

              const hppDiff = simSummary.unitHpp - baseSummary.unitHpp;
              const hppDiffPercent =
                baseSummary.unitHpp > 0 ? (hppDiff / baseSummary.unitHpp) * 100 : 0;

              return (
                <div
                  key={scen.id}
                  className="bg-white border-2 border-indigo-200 rounded-lg shadow-sm p-4 space-y-4 relative"
                >
                  <div className="border-b border-indigo-100 pb-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                        SCENARIO
                      </span>
                      <input
                        type="text"
                        value={scen.name}
                        onChange={(e) =>
                          costingActions.updateScenario(scen.id, { name: e.target.value })
                        }
                        className="font-bold text-slate-900 text-sm mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                      />
                    </div>
                    <button
                      onClick={() => costingActions.deleteScenario(scen.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scenario Inputs */}
                  <div className="space-y-2 text-xs bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium block">
                        Simulated Batch Quantity:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={scen.simulatedQuantity}
                        onChange={(e) =>
                          costingActions.updateScenario(scen.id, {
                            simulatedQuantity: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Material Adj %:</label>
                        <input
                          type="number"
                          value={scen.materialPriceAdjustmentPercent}
                          onChange={(e) =>
                            costingActions.updateScenario(scen.id, {
                              materialPriceAdjustmentPercent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-slate-800 font-mono text-xs"
                          placeholder="e.g. -5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Packaging Adj %:</label>
                        <input
                          type="number"
                          value={scen.packagingPriceAdjustmentPercent}
                          onChange={(e) =>
                            costingActions.updateScenario(scen.id, {
                              packagingPriceAdjustmentPercent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-slate-800 font-mono text-xs"
                          placeholder="e.g. -10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Labor Adj %:</label>
                        <input
                          type="number"
                          value={scen.laborAdjustmentPercent}
                          onChange={(e) =>
                            costingActions.updateScenario(scen.id, {
                              laborAdjustmentPercent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-slate-800 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Wastage %:</label>
                        <input
                          type="number"
                          value={scen.wastagePercentage}
                          onChange={(e) =>
                            costingActions.updateScenario(scen.id, {
                              wastagePercentage: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-slate-800 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scenario Results */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Simulated HPP / Unit
                      </span>
                      <div className="flex items-baseline gap-2">
                        <div className="text-xl font-black text-indigo-900">
                          {formatCurrencyValue(simSummary.unitHpp, store.currency)}
                        </div>
                        <span
                          className={`text-xs font-bold flex items-center ${
                            hppDiff <= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {hppDiff <= 0 ? (
                            <TrendingDown className="w-3.5 h-3.5 inline mr-0.5" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" />
                          )}
                          {hppDiff <= 0 ? '' : '+'}
                          {Math.round(hppDiffPercent)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span>Simulated Output:</span>
                        <span className="font-semibold text-slate-800">
                          {simSummary.actualFinishedQuantity.toLocaleString()} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Production Cost:</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrencyValue(simSummary.totalProductionCost, store.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Scenario Card */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Sliders className="w-8 h-8 text-slate-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-700">Add Scale Scenario</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Quickly simulate common batch sizes:</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {[250, 500, 1000, 2500].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAddScenario(preset)}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 text-xs font-medium rounded transition-colors shadow-xs"
                  >
                    {preset.toLocaleString()} units
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
