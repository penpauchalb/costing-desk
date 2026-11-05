import React, { useState } from 'react';
import { useCostingStore, costingActions } from './store/costingStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductListView } from './components/products/ProductListView';
import { GroupDetailView } from './components/groups/GroupDetailView';
import { ProductWorkspace } from './components/products/ProductWorkspace';
import { MasterMaterialsView } from './components/materials/MasterMaterialsView';
import { ProductionBatchesView } from './components/batches/ProductionBatchesView';
import { ScenarioCalculatorView } from './components/scenarios/ScenarioCalculatorView';
import { ReportsExportView } from './components/reports/ReportsExportView';
import { SettingsView } from './components/settings/SettingsView';
import { ProductModal } from './components/modals/ProductModal';
import { GroupModal } from './components/modals/GroupModal';
import { VariantModal } from './components/modals/VariantModal';
import { MaterialModal } from './components/modals/MaterialModal';
import { FinalizeBatchModal } from './components/modals/FinalizeBatchModal';
import { AuthModal } from './components/modals/AuthModal';
import { MasterMaterial } from './types';

export const App: React.FC = () => {
  const store = useCostingStore();

  // Modal visibility states
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalGroupId, setProductModalGroupId] = useState<string | null>(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalProductId, setVariantModalProductId] = useState<string>('');

  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MasterMaterial | null>(null);

  const [finalizeBatchModalOpen, setFinalizeBatchModalOpen] = useState(false);
  const [finalizeBatchTarget, setFinalizeBatchTarget] = useState<{
    productId: string;
    variantId: string;
  } | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleOpenNewProduct = (groupId?: string | null) => {
    setProductModalGroupId(groupId || null);
    setProductModalOpen(true);
  };

  const handleOpenNewGroup = () => {
    setEditingGroupId(null);
    setGroupModalOpen(true);
  };

  const handleEditGroup = (groupId: string) => {
    setEditingGroupId(groupId);
    setGroupModalOpen(true);
  };

  const handleOpenNewVariant = (productId: string) => {
    setVariantModalProductId(productId);
    setVariantModalOpen(true);
  };

  const handleFinalizeBatch = (productId: string, variantId: string) => {
    setFinalizeBatchTarget({ productId, variantId });
    setFinalizeBatchModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Left Sidebar */}
      <Sidebar
        onOpenNewProduct={handleOpenNewProduct}
        onOpenNewGroup={handleOpenNewGroup}
        onEditGroup={handleEditGroup}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Persistent Top Header */}
        <Header onOpenAuth={() => setAuthModalOpen(true)} />

        {/* Dynamic View Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {store.activeView === 'dashboard' && (
            <DashboardView
              onOpenNewProduct={() => handleOpenNewProduct(null)}
              onOpenNewGroup={handleOpenNewGroup}
            />
          )}

          {store.activeView === 'all-products' && (
            <ProductListView
              ungroupedOnly={false}
              onOpenNewProduct={() => handleOpenNewProduct(null)}
            />
          )}

          {store.activeView === 'ungrouped' && (
            <ProductListView
              ungroupedOnly={true}
              onOpenNewProduct={() => handleOpenNewProduct(null)}
            />
          )}

          {store.activeView === 'group-detail' && store.selectedGroupId && (
            <GroupDetailView
              groupId={store.selectedGroupId}
              onEditGroup={handleEditGroup}
              onOpenNewProduct={(gId) => handleOpenNewProduct(gId)}
            />
          )}

          {store.activeView === 'product-workspace' && store.selectedProductId && (
            <ProductWorkspace
              productId={store.selectedProductId}
              variantId={store.selectedVariantId}
              onOpenNewVariant={handleOpenNewVariant}
              onFinalizeBatch={handleFinalizeBatch}
            />
          )}

          {store.activeView === 'materials' && (
            <MasterMaterialsView
              onOpenNewMaterial={() => {
                setEditingMaterial(null);
                setMaterialModalOpen(true);
              }}
              onEditMaterial={(mat) => {
                setEditingMaterial(mat);
                setMaterialModalOpen(true);
              }}
            />
          )}

          {store.activeView === 'batches' && <ProductionBatchesView />}

          {store.activeView === 'scenarios' && <ScenarioCalculatorView />}

          {store.activeView === 'reports' && <ReportsExportView />}

          {store.activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        initialGroupId={productModalGroupId}
      />

      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        editGroupId={editingGroupId}
      />

      <VariantModal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        productId={variantModalProductId}
      />

      <MaterialModal
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        editMaterial={editingMaterial}
      />

      {finalizeBatchTarget && (
        <FinalizeBatchModal
          isOpen={finalizeBatchModalOpen}
          onClose={() => {
            setFinalizeBatchModalOpen(false);
            setFinalizeBatchTarget(null);
          }}
          productId={finalizeBatchTarget.productId}
          variantId={finalizeBatchTarget.variantId}
        />
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default App;
