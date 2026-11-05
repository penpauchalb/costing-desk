import React, { useState } from 'react';
import { X, Package, Settings2 } from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { CategoryModal } from '../categories/CategoryModal';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroupId?: string | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  initialGroupId = null,
}) => {
  const store = useCostingStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Food & Beverage');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(initialGroupId);
  const [description, setDescription] = useState('');
  const [variantName, setVariantName] = useState('Standard');
  const [plannedQty, setPlannedQty] = useState(100);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Please enter a product name and product code/SKU.');
      return;
    }

    costingActions.addProduct(
      name,
      code,
      category,
      groupId,
      description,
      variantName,
      plannedQty
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">Create New Product</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Instant Red Ginger Drink"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Code / SKU *</label>
              <input
                type="text"
                required
                placeholder="e.g. SKU-GING-01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Category</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[10px] text-sky-600 hover:text-sky-700 flex items-center gap-0.5 font-medium"
                >
                  <Settings2 className="w-2.5 h-2.5" />
                  Manage
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsCategoryModalOpen(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                {store.categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="__NEW__">+ Add Custom Category...</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Group Assignment</label>
            <select
              value={groupId || 'none'}
              onChange={(e) => setGroupId(e.target.value === 'none' ? null : e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="none">Ungrouped (Independent Product)</option>
              {store.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Grouping is optional. Ungrouped products calculate completely independently.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Variant Name</label>
              <input
                type="text"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="Standard / 250g / Size M"
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Planned Batch Output</label>
              <input
                type="number"
                min="1"
                value={plannedQty}
                onChange={(e) => setPlannedQty(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              placeholder="Formula notes, manufacturing parameters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded shadow-sm"
            >
              Create Product & Open Workspace
            </button>
          </div>
        </form>
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSelectCategory={(catName) => setCategory(catName)}
      />
    </div>
  );
};
