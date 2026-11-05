import React, { useState, useMemo } from 'react';
import {
  Package,
  Boxes,
  Layers,
  Coins,
  History,
  TrendingUp,
  Filter,
  Plus,
  ArrowRight,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { calculateProductCostSummary } from '../../engine/calculations';
import { formatCurrencyValue } from '../../engine/exportPdf';
import { generateCostingExcelWorkbook } from '../../engine/exportExcel';

interface DashboardViewProps {
  onOpenNewProduct: () => void;
  onOpenNewGroup: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewProduct,
  onOpenNewGroup,
}) => {
  const store = useCostingStore();
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    store.products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [store.products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return store.products.filter((p) => {
      const matchesSearch =
        store.searchQuery === '' ||
        p.name.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(store.searchQuery.toLowerCase());

      const matchesGroup =
        selectedGroupFilter === 'all' ||
        (selectedGroupFilter === 'ungrouped' && p.groupId === null) ||
        p.groupId === selectedGroupFilter;

      const matchesCat =
        selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;

      return matchesSearch && matchesGroup && matchesCat;
    });
  }, [store.products, store.searchQuery, selectedGroupFilter, selectedCategoryFilter]);

  // Overall calculations across filtered products
  const { totalUnits, totalCost, weightedAvgHpp, pendingWarningsCount } = useMemo(() => {
    let units = 0;
    let cost = 0;
    let pendingWarns = 0;

    filteredProducts.forEach((p) => {
      const pVariants = store.variants.filter((v) => v.productId === p.id);
      pVariants.forEach((v) => {
        const vBom = store.bom.filter((b) => b.variantId === v.id);
        const vLabor = store.labor.filter((l) => l.variantId === v.id);
        const vOverhead = store.overhead.filter((o) => o.variantId === v.id);

        const summary = calculateProductCostSummary(
          v,
          vBom,
          vLabor,
          vOverhead,
          store.materials
        );

        units += summary.actualFinishedQuantity;
        cost += summary.totalProductionCost;
        if (summary.hasPendingCosts) {
          pendingWarns += summary.pendingCount;
        }
      });
    });

    const weightedAvg = units > 0 ? cost / units : 0;
    return {
      totalUnits: units,
      totalCost: cost,
      weightedAvgHpp: weightedAvg,
      pendingWarningsCount: pendingWarns,
    };
  }, [filteredProducts, store.variants, store.bom, store.labor, store.overhead, store.materials]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Production & HPP Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Universal cost structures, consolidated batch budgeting, and weighted average HPP across all product lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              generateCostingExcelWorkbook({
                currency: store.currency,
                groups: store.groups,
                materials: store.materials,
                products: store.products,
                variants: store.variants,
                bom: store.bom,
                labor: store.labor,
                overhead: store.overhead,
                scenarios: store.scenarios,
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Workbook</span>
          </button>
          <button
            onClick={onOpenNewProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Products */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Products</span>
            <Package className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">{store.products.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{store.variants.length} total variants</div>
        </div>

        {/* Groups */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Groups</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">{store.groups.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {store.products.filter((p) => p.groupId === null).length} ungrouped items
          </div>
        </div>

        {/* Finished Units */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Units</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">{totalUnits.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Planned finished units</div>
        </div>

        {/* Total Budget */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Budget</span>
            <Coins className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-800 truncate" title={formatCurrencyValue(totalCost, store.currency)}>
            {formatCurrencyValue(totalCost, store.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Production cost sum</div>
        </div>

        {/* Weighted Avg HPP */}
        <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-3.5 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-sky-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Weighted HPP</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-lg font-bold text-sky-900 truncate" title={formatCurrencyValue(weightedAvgHpp, store.currency)}>
            {formatCurrencyValue(weightedAvgHpp, store.currency)}
          </div>
          <div className="text-[10px] text-sky-700 font-medium mt-0.5">Per finished unit avg</div>
        </div>

        {/* Master Materials */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Materials</span>
            <Boxes className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">{store.materials.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered central prices</div>
        </div>
      </div>

      {/* Incomplete Cost Alert if any pending items */}
      {pendingWarningsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <span className="font-semibold">{pendingWarningsCount} pending cost components detected.</span>{' '}
            Some product BOM or overhead entries are flagged as estimated or pending confirmation.
            Review flagged products before finalizing official production budgets.
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Filter view:</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Group Filter */}
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Groups ({store.groups.length})</option>
            <option value="ungrouped">Ungrouped Products</option>
            {store.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Consolidated Product Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Consolidated Products & HPP Calculation Breakdown
          </h2>
          <span className="text-xs text-slate-400">
            Showing {filteredProducts.length} of {store.products.length} products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <th className="py-2.5 px-3">Product Name & Code</th>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Variants</th>
                <th className="py-2.5 px-3 text-right">Production Units</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3 text-right">HPP / Unit</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.map((p) => {
                const group = p.groupId ? store.groups.find((g) => g.id === p.groupId) : null;
                const pVariants = store.variants.filter((v) => v.productId === p.id);

                let pTotalUnits = 0;
                let pTotalCost = 0;
                let hasPending = false;

                pVariants.forEach((v) => {
                  const vBom = store.bom.filter((b) => b.variantId === v.id);
                  const vLabor = store.labor.filter((l) => l.variantId === v.id);
                  const vOverhead = store.overhead.filter((o) => o.variantId === v.id);
                  const summary = calculateProductCostSummary(
                    v,
                    vBom,
                    vLabor,
                    vOverhead,
                    store.materials
                  );
                  pTotalUnits += summary.actualFinishedQuantity;
                  pTotalCost += summary.totalProductionCost;
                  if (summary.hasPendingCosts) hasPending = true;
                });

                const pHpp = pTotalUnits > 0 ? pTotalCost / pTotalUnits : 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => costingActions.openProduct(p.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.code}</div>
                    </td>
                    <td className="py-3 px-3">
                      {group ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          {group.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Ungrouped</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {pVariants.map((v) => (
                          <span
                            key={v.id}
                            className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono"
                          >
                            {v.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {pTotalUnits.toLocaleString()} units
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {formatCurrencyValue(pTotalCost, store.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-sky-700">
                      {formatCurrencyValue(pHpp, store.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {hasPending ? (
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-200">
                          Pending Costs
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium border border-emerald-200">
                          Confirmed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          costingActions.openProduct(p.id);
                        }}
                        className="text-sky-600 hover:text-sky-800 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No products matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Finalized Batches Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Production Batches & Price Snapshots
            </h3>
          </div>
          <button
            onClick={() => costingActions.setView('batches')}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            View all ({store.batches.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {store.batches.slice(0, 4).map((b) => (
            <div
              key={b.id}
              className="border border-slate-200 rounded p-3 bg-slate-50/50 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <span>Batch {b.batchNumber}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                    {b.status}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  {b.productName} — {b.variantName} ({b.actualFinishedQuantity.toLocaleString()} units)
                </div>
                <div className="text-slate-400 text-[10px] mt-1">
                  Snapshots preserved: {b.priceSnapshots?.length || 0} materials
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-sky-700">
                  {formatCurrencyValue(b.unitHpp, store.currency)}
                </div>
                <div className="text-[10px] text-slate-400">Unit HPP</div>
              </div>
            </div>
          ))}

          {store.batches.length === 0 && (
            <div className="text-xs text-slate-400 italic py-3 col-span-2 text-center">
              No batches finalized yet. You can finalize a batch directly inside any Product Workspace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
