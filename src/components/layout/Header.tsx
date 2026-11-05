import React, { useState } from 'react';
import {
  Search,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  User as UserIcon,
  Globe,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';
import { CurrencyCode } from '../../types';
import { generateCostingExcelWorkbook } from '../../engine/exportExcel';
import { generateCostingPdfReport } from '../../engine/exportPdf';

interface HeaderProps {
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const store = useCostingStore();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const currencies: CurrencyCode[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'GBP'];

  const handleExcelExport = () => {
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
    setShowExportMenu(false);
  };

  const handlePdfExport = () => {
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
    setShowExportMenu(false);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Search input */}
      <div className="flex items-center gap-3 w-72 md:w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, materials, groups..."
            value={store.searchQuery}
            onChange={(e) => costingActions.setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={store.currency}
            onChange={(e) => costingActions.setCurrency(e.target.value as CurrencyCode)}
            className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {curr} {curr === 'IDR' ? '(Rp)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Database Connection Status */}
        <button
          onClick={() => costingActions.setView('settings')}
          title={store.supabaseStatus.message}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
            store.supabaseStatus.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className={`w-3.5 h-3.5 ${store.supabaseStatus.connected ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span className="hidden sm:inline font-medium">
            {store.supabaseStatus.connected ? 'Cloud DB' : 'Local Mode'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              store.supabaseStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
        </button>

        {/* Export Quick Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30">
              <button
                onClick={handleExcelExport}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel (.xlsx)</span>
              </button>
              <button
                onClick={handlePdfExport}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Export PDF (.pdf)</span>
              </button>
            </div>
          )}
        </div>

        {/* User Account / Auth */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 rounded-full p-1 text-slate-600 hover:text-slate-900 transition-colors"
          title={store.supabaseStatus.userEmail || 'Account & Auth'}
        >
          <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-sky-800 font-semibold text-xs">
            {store.supabaseStatus.userEmail ? (
              store.supabaseStatus.userEmail.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>
    </header>
  );
};
