import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  ArrowRightLeft,
  Calendar,
  Building,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { MasterMaterial } from '../../types';
import { formatCurrencyValue } from '../../engine/exportPdf';
import { calculateCostPerConsumptionUnit } from '../../engine/unitConversions';

interface MasterMaterialsViewProps {
  onOpenNewMaterial: () => void;
  onEditMaterial: (material: MasterMaterial) => void;
}

export const MasterMaterialsView: React.FC<MasterMaterialsViewProps> = ({
  onOpenNewMaterial,
  onEditMaterial,
}) => {
  const store = useCostingStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    store.materials.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [store.materials]);

  const filteredMaterials = useMemo(() => {
    return store.materials.filter((m) => {
      const matchSearch =
        search === '' ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.supplier && m.supplier.toLowerCase().includes(search.toLowerCase()));

      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [store.materials, search, selectedCategory]);

  const handleDelete = (mat: MasterMaterial) => {
    if (
      window.confirm(
        `Delete material "${mat.name}"? Active BOM components linked to it will retain their current price but become unlinked.`
      )
    ) {
      costingActions.deleteMaterial(mat.id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0 mt-0.5">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Master Materials Database</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Centralized pricing repository. Enter purchase costs once and auto-convert to consumption units across product BOMs. Finalized production runs preserve historical snapshots.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenNewMaterial}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Material</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search material or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Categories ({store.materials.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <th className="py-2.5 px-3">Material Name & Category</th>
                <th className="py-2.5 px-3 text-right">Purchase Price</th>
                <th className="py-2.5 px-3">Conversion Factor</th>
                <th className="py-2.5 px-3 text-right">Unit Cost (Consumption)</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Last Updated</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMaterials.map((mat) => {
                const costPerConsumption = calculateCostPerConsumptionUnit(
                  mat.purchasePrice,
                  mat.conversionFactor
                );

                return (
                  <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{mat.name}</div>
                      <div className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded inline-block mt-0.5 border border-teal-200/50">
                        {mat.category}
                      </div>
                      {mat.notes && (
                        <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate">
                          {mat.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      <div>{formatCurrencyValue(mat.purchasePrice, store.currency)}</div>
                      <div className="text-[10px] text-slate-400">per {mat.purchaseUnit}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                        <span>1 {mat.purchaseUnit}</span>
                        <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                        <span>
                          {mat.conversionFactor.toLocaleString()} {mat.consumptionUnit}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-teal-800">
                      <div>{formatCurrencyValue(costPerConsumption, store.currency)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        per {mat.consumptionUnit}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {mat.supplier ? (
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{mat.supplier}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(mat.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditMaterial(mat)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Edit Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(mat)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Delete Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No materials found. Register a material to reuse its price across product BOMs.
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
