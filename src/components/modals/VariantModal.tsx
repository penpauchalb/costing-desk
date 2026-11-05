import React, { useState } from 'react';
import { X, Layers } from 'lucide-react';
import { costingActions } from '../../store/costingStore';
import { COMMON_UNITS } from '../../engine/unitConversions';

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
}

export const VariantModal: React.FC<VariantModalProps> = ({
  isOpen,
  onClose,
  productId,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [sizeWeightVolume, setSizeWeightVolume] = useState<number | undefined>(undefined);
  const [unit, setUnit] = useState('g');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a variant name (e.g. 250g, 500g, Size L).');
      return;
    }

    costingActions.addVariant(productId, name, sku, sizeWeightVolume, unit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">Add Product Variant</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Variant Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. 250g Pouch, 500g Jar, Size M, 100ml"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Variant SKU</label>
            <input
              type="text"
              placeholder="e.g. SKU-VAR-250G"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Size / Weight</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 250"
                value={sizeWeightVolume ?? ''}
                onChange={(e) =>
                  setSizeWeightVolume(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Measurement Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
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
              Add Variant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
