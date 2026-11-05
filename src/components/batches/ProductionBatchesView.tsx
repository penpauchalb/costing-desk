import React, { useState } from 'react';
import {
  History,
  Lock,
  Calendar,
  Package,
  Layers,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { ProductionBatch } from '../../types';
import { formatCurrencyValue } from '../../engine/exportPdf';

export const ProductionBatchesView: React.FC = () => {
  const store = useCostingStore();
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);

  const handleDeleteBatch = (batchId: string) => {
    if (window.confirm('Delete this finalized batch record?')) {
      costingActions.deleteBatch(batchId);
      if (selectedBatch?.id === batchId) {
        setSelectedBatch(null);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0 mt-0.5">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Production Batches & Historical Snapshots
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Immutable batch archive. When a production batch is finalized, exact material prices, formulas, and costs are locked in time. Subsequent updates to Master Material prices never alter historical batch HPP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Snapshot Isolation Active</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches List (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Finalized Batches ({store.batches.length})
            </h2>
            <span className="text-[11px] text-slate-400">Click batch to view preserved snapshot</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {store.batches.map((b) => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBatch(b)}
                  className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-sky-50/70 border-l-4 border-sky-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Batch {b.batchNumber}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                        {b.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-slate-600 font-medium">
                      {b.productName} — <span className="text-slate-500">{b.variantName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {b.finalizedAt
                            ? new Date(b.finalizedAt).toLocaleDateString()
                            : new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{b.actualFinishedQuantity.toLocaleString()} finished units</span>
                      <span>•</span>
                      <span>{b.priceSnapshots?.length || 0} material snapshots</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold text-sky-800">
                      {formatCurrencyValue(b.unitHpp, store.currency)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Total: {formatCurrencyValue(b.totalProductionCost, store.currency)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBatch(b.id);
                      }}
                      className="text-rose-500 hover:text-rose-700 text-[11px] p-1 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {store.batches.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                No finalized batches yet. Go to any Product Workspace and click &ldquo;Finalize Batch&rdquo; to lock a production run.
              </div>
            )}
          </div>
        </div>

        {/* Snapshot Details Panel (Right col) */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Historical Price Snapshot</span>
            </h3>
            {selectedBatch && (
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedBatch.batchNumber}
              </span>
            )}
          </div>

          {selectedBatch ? (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 rounded p-3 space-y-1.5 border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product:</span>
                  <span className="font-semibold text-slate-800">{selectedBatch.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Variant:</span>
                  <span className="font-medium text-slate-700">{selectedBatch.variantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Finished Units:</span>
                  <span className="font-medium text-slate-700">
                    {selectedBatch.actualFinishedQuantity.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500 font-medium">Locked Unit HPP:</span>
                  <span className="font-bold text-sky-800">
                    {formatCurrencyValue(selectedBatch.unitHpp, store.currency)}
                  </span>
                </div>
              </div>

              {/* Price Snapshots Table */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-2 text-[11px] uppercase tracking-wider">
                  Preserved Material Prices (Test F)
                </h4>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <tr>
                        <th className="py-1.5 px-2">Material</th>
                        <th className="py-1.5 px-2 text-right">Locked Price</th>
                        <th className="py-1.5 px-2 text-right">Unit Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedBatch.priceSnapshots?.map((snap, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-2 font-medium">{snap.materialName}</td>
                          <td className="py-1.5 px-2 text-right text-slate-500 font-mono">
                            {formatCurrencyValue(snap.purchasePrice, store.currency)} / {snap.purchaseUnit}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-teal-800 font-mono">
                            {formatCurrencyValue(snap.unitPriceUsed, store.currency)} / {snap.consumptionUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  Even if current Master Material prices increase or decrease in the future, the above rates remain permanently frozen for this batch.
                </p>
              </div>

              {selectedBatch.notes && (
                <div className="bg-amber-50/60 border border-amber-200/60 rounded p-2.5 text-[11px] text-amber-900">
                  <span className="font-semibold block mb-0.5">Batch Notes:</span>
                  {selectedBatch.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select any batch from the list to inspect its locked price snapshot.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
