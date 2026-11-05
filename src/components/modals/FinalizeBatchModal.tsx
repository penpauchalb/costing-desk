import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { calculateProductCostSummary } from '../../engine/calculations';
import { formatCurrencyValue } from '../../engine/exportPdf';

interface FinalizeBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  variantId: string;
}

export const FinalizeBatchModal: React.FC<FinalizeBatchModalProps> = ({
  isOpen,
  onClose,
  productId,
  variantId,
}) => {
  const store = useCostingStore();

  const product = store.products.find((p) => p.id === productId);
  const variant = store.variants.find((v) => v.id === variantId);

  const defaultBatchNo = `B-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
  const [batchNumber, setBatchNumber] = useState(defaultBatchNo);
  const [notes, setNotes] = useState('');

  if (!isOpen || !product || !variant) return null;

  const variantBom = store.bom.filter((b) => b.variantId === variantId);
  const variantLabor = store.labor.filter((l) => l.variantId === variantId);
  const variantOverhead = store.overhead.filter((o) => o.variantId === variantId);

  const summary = calculateProductCostSummary(
    variant,
    variantBom,
    variantLabor,
    variantOverhead,
    store.materials
  );

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber.trim()) {
      alert('Please enter a batch number.');
      return;
    }

    const created = costingActions.finalizeBatch(
      productId,
      variantId,
      batchNumber,
      notes
    );

    if (created) {
      alert(`Production batch ${batchNumber} successfully recorded with historical price snapshot.`);
      onClose();
      costingActions.setView('batches');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Finalize Production Batch</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFinalize} className="p-5 space-y-4 text-xs">
          {/* Summary Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-1.5">
            <div className="font-bold text-emerald-900 text-xs">
              {product.name} — {variant.name}
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Actual Finished Units:</span>
                <span className="font-semibold text-slate-800">
                  {summary.actualFinishedQuantity.toLocaleString()} {variant.measurementUnit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Calculated Unit HPP:</span>
                <span className="font-bold text-emerald-800">
                  {formatCurrencyValue(summary.unitHpp, store.currency)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
            <input
              type="text"
              required
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono font-bold focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Production Notes</label>
            <textarea
              rows={2}
              placeholder="Shift details, machine line, operator notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Historical Snapshot Warning & Isolation Explainer */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Historical Price Snapshot Preservation (Test F)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Finalizing this batch locks the {variantBom.length} BOM component prices currently in place. If master material prices change in the future, this batch report will remain permanently preserved and unchanged.
            </p>
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-sm"
            >
              Finalize & Lock Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
