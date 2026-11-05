import React, { useMemo } from 'react';
import {
  Folder,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  FileText,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { calculateGroupSummary, calculateProductCostSummary } from '../../engine/calculations';
import { formatCurrencyValue, generateCostingPdfReport } from '../../engine/exportPdf';
import { generateCostingExcelWorkbook } from '../../engine/exportExcel';

interface GroupDetailViewProps {
  groupId: string;
  onEditGroup: (groupId: string) => void;
  onOpenNewProduct: (groupId: string) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  groupId,
  onEditGroup,
  onOpenNewProduct,
}) => {
  const store = useCostingStore();

  const group = store.groups.find((g) => g.id === groupId);
  const groupProducts = useMemo(
    () => store.products.filter((p) => p.groupId === groupId),
    [store.products, groupId]
  );

  // Calculate summaries for each variant in this group
  const variantSummaries = useMemo(() => {
    return groupProducts.flatMap((p) => {
      const pVariants = store.variants.filter((v) => v.productId === p.id);
      return pVariants.map((v) => {
        const vBom = store.bom.filter((b) => b.variantId === v.id);
        const vLabor = store.labor.filter((l) => l.variantId === v.id);
        const vOverhead = store.overhead.filter((o) => o.variantId === v.id);
        const summary = calculateProductCostSummary(v, vBom, vLabor, vOverhead, store.materials);
        return {
          product: p,
          variant: v,
          summary,
        };
      });
    });
  }, [groupProducts, store.variants, store.bom, store.labor, store.overhead, store.materials]);

  // Group Consolidated Summary
  const groupSummary = useMemo(() => {
    if (!group) return null;
    return calculateGroupSummary(group, variantSummaries);
  }, [group, variantSummaries]);

  if (!group || !groupSummary) {
    return (
      <div className="p-8 text-center text-slate-500">
        Group not found.
      </div>
    );
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete group "${group.name}"? Products inside will become Ungrouped.`
      )
    ) {
      costingActions.deleteGroup(group.id);
    }
  };

  const handleExportPdf = () => {
    generateCostingPdfReport({
      currency: store.currency,
      group,
      allProducts: store.products,
      allVariants: store.variants,
      allGroups: store.groups,
      bom: store.bom,
      labor: store.labor,
      overhead: store.overhead,
      materials: store.materials,
      exportType: 'group',
    });
  };

  const handleExportExcel = () => {
    generateCostingExcelWorkbook({
      currency: store.currency,
      groups: [group],
      materials: store.materials,
      products: groupProducts,
      variants: store.variants.filter((v) =>
        groupProducts.some((gp) => gp.id === v.productId)
      ),
      bom: store.bom,
      labor: store.labor,
      overhead: store.overhead,
      scenarios: store.scenarios,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Group Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{group.name}</h1>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {groupProducts.length} products
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {group.description || 'No description provided. Products in this group can have independent cost structures.'}
            </p>
          </div>
        </div>

        {/* Group Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenNewProduct(group.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded transition-colors"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded transition-colors"
            title="Export PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => onEditGroup(group.id)}
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded"
            title="Rename Group"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded"
            title="Delete Group"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Group KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Products */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Products</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{groupSummary.productCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{variantSummaries.length} variants</div>
        </div>

        {/* Finished Units */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Units</div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {groupSummary.totalFinishedUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Finished output sum</div>
        </div>

        {/* Raw Materials */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Raw Materials</div>
          <div className="text-sm font-bold text-slate-800 mt-1 truncate" title={formatCurrencyValue(groupSummary.totalRawMaterialsCost, store.currency)}>
            {formatCurrencyValue(groupSummary.totalRawMaterialsCost, store.currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ingredients & materials</div>
        </div>

        {/* Packaging */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Packaging</div>
          <div className="text-sm font-bold text-slate-800 mt-1 truncate" title={formatCurrencyValue(groupSummary.totalPackagingCost, store.currency)}>
            {formatCurrencyValue(groupSummary.totalPackagingCost, store.currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pouch, box, labels</div>
        </div>

        {/* Labor & Overhead */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Labor & Overhead</div>
          <div className="text-sm font-bold text-slate-800 mt-1 truncate" title={formatCurrencyValue(groupSummary.totalLaborCost + groupSummary.totalOverheadCost, store.currency)}>
            {formatCurrencyValue(groupSummary.totalLaborCost + groupSummary.totalOverheadCost, store.currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Processes & operations</div>
        </div>

        {/* Weighted Average HPP */}
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 flex items-center justify-between">
            <span>Weighted HPP</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-base font-bold text-sky-900 mt-1 truncate" title={formatCurrencyValue(groupSummary.weightedAverageHpp, store.currency)}>
            {formatCurrencyValue(groupSummary.weightedAverageHpp, store.currency)}
          </div>
          <div className="text-[10px] text-sky-700 font-medium mt-0.5">Per finished unit</div>
        </div>
      </div>

      {/* Products in Group Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Products in this Group
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {variantSummaries.length} variant calculations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Variant</th>
                <th className="py-2.5 px-3">Size / Measure</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">HPP / Unit</th>
                <th className="py-2.5 px-3 text-right">Total Production Cost</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {variantSummaries.map(({ product, variant, summary }) => (
                <tr
                  key={variant.id}
                  onClick={() => costingActions.openProduct(product.id, variant.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>{product.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono pl-5">{product.code}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                      {variant.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {variant.sizeWeightVolume ? `${variant.sizeWeightVolume} ${variant.measurementUnit}` : variant.measurementUnit}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">
                    {summary.actualFinishedQuantity.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sky-700">
                    {formatCurrencyValue(summary.unitHpp, store.currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800">
                    {formatCurrencyValue(summary.totalProductionCost, store.currency)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {summary.hasPendingCosts ? (
                      <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-200">
                        Pending ({summary.pendingCount})
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
                        costingActions.openProduct(product.id, variant.id);
                      }}
                      className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1"
                    >
                      <span>Costing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {variantSummaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No products inside this group yet.{' '}
                    <button
                      onClick={() => onOpenNewProduct(group.id)}
                      className="text-sky-600 underline font-medium hover:text-sky-700 ml-1"
                    >
                      Add product to group
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            {/* Consolidated Group Totals Footer Row */}
            {variantSummaries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/70 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td colSpan={3} className="py-3 px-3 uppercase text-[11px] tracking-wider text-slate-600">
                    Group Consolidated Total
                  </td>
                  <td className="py-3 px-3 text-right">
                    {groupSummary.totalFinishedUnits.toLocaleString()} units
                  </td>
                  <td className="py-3 px-3 text-right text-sky-800">
                    {formatCurrencyValue(groupSummary.weightedAverageHpp, store.currency)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {formatCurrencyValue(groupSummary.totalProductionCost, store.currency)}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center text-[10px] text-slate-500 font-normal">
                    Weighted Avg HPP applied
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
