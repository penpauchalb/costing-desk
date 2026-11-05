import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  ArrowRight,
  TrendingUp,
  Coins,
  Search,
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
}) => {
  const store = useCostingStore();
  const [search, setSearch] = useState('');

  // Filtered products
  const filteredProducts = useMemo(() => {
    return store.products.filter((p) => {
      return (
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [store.products, search]);

  // Overall calculations across all products
  const { totalUnits, totalCost, weightedAvgHpp } = useMemo(() => {
    let units = 0;
    let cost = 0;

    store.products.forEach((p) => {
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
      });
    });

    const weightedAvg = units > 0 ? cost / units : 0;
    return {
      totalUnits: units,
      totalCost: cost,
      weightedAvgHpp: weightedAvg,
    };
  }, [store.products, store.variants, store.bom, store.labor, store.overhead, store.materials]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Costing Desk Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Universal HPP calculation and production cost management overview.
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={onOpenNewProduct}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* 2. Simple 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Products */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Products
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{store.products.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{store.variants.length} active variants</div>
        </div>

        {/* Finished Units */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Finished Units
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Planned output</div>
        </div>

        {/* Total Budget */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Budget
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 truncate" title={formatCurrencyValue(totalCost, store.currency)}>
            {formatCurrencyValue(totalCost, store.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Production cost sum</div>
        </div>

        {/* Weighted Avg HPP */}
        <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center justify-between">
            <span>Weighted HPP</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-lg font-black text-sky-950 mt-1 truncate" title={formatCurrencyValue(weightedAvgHpp, store.currency)}>
            {formatCurrencyValue(weightedAvgHpp, store.currency)}
          </div>
          <div className="text-[10px] text-sky-700 font-medium mt-0.5">Average per unit</div>
        </div>
      </div>

      {/* 3. Simple Product List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder-slate-400"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredProducts.length} products
          </span>
        </div>

        {/* Clean Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Group</th>
                <th className="py-2.5 px-4 text-right">Production Units</th>
                <th className="py-2.5 px-4 text-right">Total Production Cost</th>
                <th className="py-2.5 px-4 text-right">HPP / Unit</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProducts.map((p) => {
                const group = p.groupId ? store.groups.find((g) => g.id === p.groupId) : null;
                const pVariants = store.variants.filter((v) => v.productId === p.id);

                let pTotalUnits = 0;
                let pTotalCost = 0;

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
                });

                const pHpp = pTotalUnits > 0 ? pTotalCost / pTotalUnits : 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => costingActions.openProduct(p.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.code}</div>
                    </td>

                    <td className="py-3 px-4">
                      {group ? (
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          {group.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Ungrouped</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {pTotalUnits.toLocaleString()} units
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {formatCurrencyValue(pTotalCost, store.currency)}
                    </td>

                    <td className="py-3 px-4 text-right font-black text-sky-800 text-sm">
                      {formatCurrencyValue(pHpp, store.currency)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          costingActions.openProduct(p.id);
                        }}
                        className="text-sky-600 hover:text-sky-800 font-bold inline-flex items-center gap-1 text-xs"
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
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No products found matching &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
