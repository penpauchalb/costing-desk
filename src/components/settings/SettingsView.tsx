import React, { useState } from 'react';
import {
  Settings,
  Database,
  Key,
  Globe,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  costingActions,
  refreshSupabaseConnection,
  useCostingStore,
} from '../../store/costingStore';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
} from '../../store/supabaseClient';
import { CurrencyCode } from '../../types';

export const SettingsView: React.FC = () => {
  const store = useCostingStore();

  const currentConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig.anonKey);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingConnection(true);
    setTestResult(null);

    saveStoredSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
    });

    await refreshSupabaseConnection();
    setTestingConnection(false);
    setTestResult('Supabase configuration saved and connection refreshed.');
  };

  const handleExportJson = () => {
    const jsonStr = costingActions.exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CostingDesk_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = costingActions.importBackupJson(content);
        if (success) {
          alert('Backup data successfully imported!');
        } else {
          alert('Failed to import backup: Invalid JSON format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Reset all data back to the default sample dataset (Product Line A, Apparel, Soap, Master Materials)? All custom changes will be overwritten.'
      )
    ) {
      costingActions.resetToInitialSampleData();
      alert('Data reset to verification sample dataset.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0 mt-0.5">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">System Settings & Data Sync</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Configure Supabase PostgreSQL cloud backend, default currencies, JSON backup exports, and database migrations.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Database (Supabase) Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Supabase Cloud Database & Auth Configuration
            </h2>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
              store.supabaseStatus.connected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                store.supabaseStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{store.supabaseStatus.connected ? 'Connected to Cloud' : 'Local Offline Mode'}</span>
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Connect your free Supabase PostgreSQL database for persistent multi-device access and user authentication.
          If credentials are not entered, COSTING DESK continues operating flawlessly in zero-latency offline local-first mode.
        </p>

        <form onSubmit={handleSaveSupabaseConfig} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Supabase Project URL</label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:ring-1 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Supabase Anon Public Key</label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:ring-1 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={testingConnection}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-medium rounded text-xs transition-colors shadow-sm"
            >
              {testingConnection ? 'Verifying...' : 'Save & Test Connection'}
            </button>

            {testResult && (
              <span className="text-xs text-emerald-600 font-medium">{testResult}</span>
            )}
          </div>
        </form>
      </div>

      {/* SQL Migration Script Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold uppercase tracking-wider text-slate-800">
              Database Migration SQL Schema
            </h3>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `-- See supabase/migrations/20261105_init_costing_desk.sql for the complete SQL schema with Row Level Security.`
              );
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedSql ? 'Copied' : 'Copy SQL Location'}</span>
          </button>
        </div>
        <p className="text-slate-500">
          The complete database migration script with PostgreSQL tables, foreign keys, and Row Level Security (RLS) is located at:
          <code className="block bg-slate-100 p-2 rounded text-[11px] font-mono text-slate-800 mt-1">
            supabase/migrations/20261105_init_costing_desk.sql
          </code>
        </p>
      </div>

      {/* Currency Preferences */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-600" />
          <h3 className="font-bold uppercase tracking-wider text-slate-800">
            Display Currency & Formatting
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Active Currency:</span>
          <select
            value={store.currency}
            onChange={(e) => costingActions.setCurrency(e.target.value as CurrencyCode)}
            className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="IDR">IDR — Indonesian Rupiah (Rp)</option>
            <option value="USD">USD — US Dollar ($)</option>
            <option value="EUR">EUR — Euro (€)</option>
            <option value="SGD">SGD — Singapore Dollar (S$)</option>
            <option value="MYR">MYR — Malaysian Ringgit (RM)</option>
            <option value="GBP">GBP — British Pound (£)</option>
          </select>
        </div>
      </div>

      {/* Data Sovereignty, Backup & Reset */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold uppercase tracking-wider text-slate-800">
          Data Sovereignty, JSON Backup & Restore
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export JSON Backup</span>
          </button>

          <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Import JSON Restore</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetData}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded transition-colors border border-rose-200"
          >
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <span>Reset to Verification Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
