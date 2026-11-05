import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Plus,
  Search,
  Copy,
  Trash2,
  FolderInput,
  ArrowRight,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { calculateProductCostSummary } from '../../engine/calculations';
import { formatCurrencyValue } from '../../engine/exportPdf';

interface ProductListViewProps {
  ungroupedOnly?: boolean;
  onOpenNewProduct: () => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  ungroupedOnly = false,
  onOpenNewProduct,
}) => {
  const store = useCostingStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const productsToDisplay = useMemo(() => {
    return store.products.filter((p) => {
      if (ungroupedOnly && p.groupId !== null) return false;

      const matchesSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase());

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [store.products, ungroupedOnly, search, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    store.products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [store.products]);

  const handleGroupReassign = (productId: string, newGroupId: string) => {
    costingActions.moveProductToGroup(productId, newGroupId === 'none' ? null : newGroupId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
              ungroupedOnly ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
            }`}
          >
            {ungroupedOnly ? <Layers className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {ungroupedOnly ? 'Ungrouped Products' : 'All Products'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {ungroupedOnly
                ? 'Standalone products not assigned to any group. Costing works completely independently. You can move them into a group at any time without altering their HPP calculations.'
                : 'Central directory of all manufactured products, formulations, and active variants across your workspaces.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenNewProduct}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Product</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <th className="py-2.5 px-3">Product Name & Code</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Group Assignment</th>
                <th className="py-2.5 px-3">Variants</th>
                <th className="py-2.5 px-3 text-right">Planned Units</th>
                <th className="py-2.5 px-3 text-right">Total Production Cost</th>
                <th className="py-2.5 px-3 text-right">HPP / Unit</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {productsToDisplay.map((p) => {
                const group = p.groupId ? store.groups.find((g) => g.id === p.groupId) : null;
                const pVariants = store.variants.filter((v) => v.productId === p.id);

                let totalUnits = 0;
                let totalCost = 0;

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
                  totalUnits += summary.actualFinishedQuantity;
                  totalCost += summary.totalProductionCost;
                });

                const hpp = totalUnits > 0 ? totalCost / totalUnits : 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => costingActions.openProduct(p.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {p.category}
                      </span>
                    </td>

                    <td
                      className="py-3 px-3"
                      onClick={(e) => e.stopPropagation()} // Prevent row click when selecting group
                    >
                      <div className="flex items-center gap-1.5">
                        <FolderInput className="w-3 h-3 text-slate-400" />
                        <select
                          value={p.groupId || 'none'}
                          onChange={(e) => handleGroupReassign(p.id, e.target.value)}
                          className="bg-transparent border border-slate-200 hover:border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="none">Ungrouped</option>
                          {store.groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
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
                      {totalUnits.toLocaleString()} units
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {formatCurrencyValue(totalCost, store.currency)}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-sky-700">
                      {formatCurrencyValue(hpp, store.currency)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => costingActions.duplicateProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          title="Duplicate Product"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete product "${p.name}"?`)) {
                              costingActions.deleteProduct(p.id);
                            }
                          }}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => costingActions.openProduct(p.id)}
                          className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1 pl-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {productsToDisplay.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {ungroupedOnly
                      ? 'No ungrouped products found. All products are assigned to groups.'
                      : 'No products found. Click "New Product" above to create one.'}
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
