import React, { useState } from 'react';
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  Layers,
  Package,
  Globe,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { CurrencyCode } from '../../types';
import { generateCostingExcelWorkbook } from '../../engine/exportExcel';
import { generateCostingPdfReport } from '../../engine/exportPdf';

export const ReportsExportView: React.FC = () => {
  const store = useCostingStore();

  const [pdfScope, setPdfScope] = useState<'all' | 'group' | 'product'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    store.groups[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    store.products[0]?.id || ''
  );

  const handleDownloadExcel = () => {
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
    });
  };

  const handleDownloadPdf = () => {
    if (pdfScope === 'product') {
      const prod = store.products.find((p) => p.id === selectedProductId);
      const variant = store.variants.find((v) => v.productId === selectedProductId);
      if (prod && variant) {
        generateCostingPdfReport({
          currency: store.currency,
          product: prod,
          variant,
          allGroups: store.groups,
          bom: store.bom,
          labor: store.labor,
          overhead: store.overhead,
          materials: store.materials,
          exportType: 'single_product',
        });
      }
    } else if (pdfScope === 'group') {
      const grp = store.groups.find((g) => g.id === selectedGroupId);
      if (grp) {
        generateCostingPdfReport({
          currency: store.currency,
          group: grp,
          allProducts: store.products,
          allVariants: store.variants,
          allGroups: store.groups,
          bom: store.bom,
          labor: store.labor,
          overhead: store.overhead,
          materials: store.materials,
          exportType: 'group',
        });
      }
    } else {
      generateCostingPdfReport({
        currency: store.currency,
        allProducts: store.products,
        allVariants: store.variants,
        allGroups: store.groups,
        bom: store.bom,
        labor: store.labor,
        overhead: store.overhead,
        materials: store.materials,
        exportType: 'consolidated_all',
      });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0 mt-0.5">
            <FileBarChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reports & Export Center</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Export audit-ready Excel workbooks and presentation-grade PDF documents with exact formulas, cost structures, and consolidated weighted averages.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: EXCEL WORKBOOK EXPORT */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Professional Excel Workbook (.xlsx)</h3>
                <span className="text-[11px] text-slate-400">Multi-sheet comprehensive spreadsheet</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Generates a multi-tab workbook containing:
            </p>

            <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 1: Consolidated Summary (Totals & Weighted Average HPP)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 2: Product Details & Yield Math</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 3: Bill of Materials (BOM Component Breakdown)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 4: Labor & Production Processes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 5: Overhead & Operational Expenses</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 6: Master Materials Database & Conversion Factors</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Sheet 7: Scenario Comparison & Sensitivity</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadExcel}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-colors shadow-sm mt-4"
          >
            <Download className="w-4 h-4" />
            <span>Download Complete Excel Workbook</span>
          </button>
        </div>

        {/* CARD 2: PDF REPORT EXPORT */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Print-Ready PDF Reports (.pdf)</h3>
                <span className="text-[11px] text-slate-400">Formal managerial documentation</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Select Report Scope:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPdfScope('all')}
                    className={`py-1.5 px-2 rounded text-center border font-medium transition-colors ${
                      pdfScope === 'all'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    All Products
                  </button>
                  <button
                    onClick={() => setPdfScope('group')}
                    className={`py-1.5 px-2 rounded text-center border font-medium transition-colors ${
                      pdfScope === 'group'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    By Group
                  </button>
                  <button
                    onClick={() => setPdfScope('product')}
                    className={`py-1.5 px-2 rounded text-center border font-medium transition-colors ${
                      pdfScope === 'product'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Single Product
                  </button>
                </div>
              </div>

              {pdfScope === 'group' && (
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Select Group:</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {store.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {pdfScope === 'product' && (
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Select Product:</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {store.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDownloadPdf}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded transition-colors shadow-sm mt-4"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
