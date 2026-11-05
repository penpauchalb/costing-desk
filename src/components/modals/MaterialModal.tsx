import React, { useState, useEffect } from 'react';
import { X, Boxes, ArrowRightLeft, Settings2 } from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { MasterMaterial } from '../../types';
import {
  calculateCostPerConsumptionUnit,
  getSuggestedConversionFactor,
} from '../../engine/unitConversions';
import { formatCurrencyValue } from '../../engine/exportPdf';
import { CategoryModal } from '../categories/CategoryModal';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  editMaterial?: MasterMaterial | null;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  editMaterial = null,
}) => {
  const store = useCostingStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Raw Materials');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [purchaseUnit, setPurchaseUnit] = useState('kg');
  const [purchasePrice, setPurchasePrice] = useState<number>(29000);
  const [consumptionUnit, setConsumptionUnit] = useState('gram');
  const [conversionFactor, setConversionFactor] = useState<number>(1000);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editMaterial) {
      setName(editMaterial.name);
      setCategory(editMaterial.category);
      setPurchaseUnit(editMaterial.purchaseUnit);
      setPurchasePrice(editMaterial.purchasePrice);
      setConsumptionUnit(editMaterial.consumptionUnit);
      setConversionFactor(editMaterial.conversionFactor);
      setSupplier(editMaterial.supplier || '');
      setNotes(editMaterial.notes || '');
    } else {
      setName('');
      setCategory('Raw Materials');
      setPurchaseUnit('kg');
      setPurchasePrice(29000);
      setConsumptionUnit('gram');
      setConversionFactor(1000);
      setSupplier('');
      setNotes('');
    }
  }, [editMaterial, isOpen]);

  if (!isOpen) return null;

  // Auto-update suggested conversion factor when units change
  const handlePurchaseUnitChange = (pUnit: string) => {
    setPurchaseUnit(pUnit);
    const suggested = getSuggestedConversionFactor(pUnit, consumptionUnit);
    setConversionFactor(suggested);
  };

  const handleConsumptionUnitChange = (cUnit: string) => {
    setConsumptionUnit(cUnit);
    const suggested = getSuggestedConversionFactor(purchaseUnit, cUnit);
    setConversionFactor(suggested);
  };

  const costPerConsumption = calculateCostPerConsumptionUnit(purchasePrice, conversionFactor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter material name.');
      return;
    }
    if (conversionFactor <= 0) {
      alert('Conversion factor must be greater than zero.');
      return;
    }

    if (editMaterial) {
      costingActions.updateMaterial(editMaterial.id, {
        name: name.trim(),
        category: category.trim(),
        purchaseUnit: purchaseUnit.trim(),
        purchasePrice,
        consumptionUnit: consumptionUnit.trim(),
        conversionFactor,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      costingActions.addMaterial({
        name: name.trim(),
        category: category.trim(),
        purchaseUnit: purchaseUnit.trim(),
        purchasePrice,
        consumptionUnit: consumptionUnit.trim(),
        conversionFactor,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {editMaterial ? 'Edit Master Material' : 'Register Master Material'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Material Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Refined Sugar, Cotton 30s Fabric, 250g Pouch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Category</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[10px] text-teal-600 hover:text-teal-700 flex items-center gap-0.5 font-medium"
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
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                {store.categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="__NEW__">+ Add Custom Category...</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier (Optional)</label>
              <input
                type="text"
                placeholder="Vendor or Distributor"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing & Units */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purchase Unit</label>
                <input
                  type="text"
                  placeholder="kg, liter, meter, pack, box"
                  value={purchaseUnit}
                  onChange={(e) => handlePurchaseUnitChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Purchase Price ({store.currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Consumption Unit</label>
                <input
                  type="text"
                  placeholder="gram, ml, cm, pcs"
                  value={consumptionUnit}
                  onChange={(e) => handleConsumptionUnitChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Conversion Factor *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(parseFloat(e.target.value) || 1)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-800 font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Calculated Unit Cost */}
            <div className="bg-teal-50 border border-teal-200 rounded p-2.5 flex items-center justify-between">
              <div className="text-[11px] text-teal-800">
                <span>1 {purchaseUnit} = </span>
                <span className="font-bold">
                  {conversionFactor.toLocaleString()} {consumptionUnit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-teal-600 block">Cost per {consumptionUnit}:</span>
                <span className="text-xs font-bold text-teal-900">
                  {formatCurrencyValue(costPerConsumption, store.currency)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Package specs, storage conditions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
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
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-sm"
            >
              {editMaterial ? 'Save Changes' : 'Register Material'}
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
