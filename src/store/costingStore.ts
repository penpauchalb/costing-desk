import { useState, useEffect } from 'react';
import {
  BomComponent,
  CurrencyCode,
  MasterMaterial,
  OverheadItem,
  Product,
  ProductGroup,
  ProductionBatch,
  ProductionProcessStage,
  ProductVariant,
  Scenario,
} from '../types';
import {
  INITIAL_BATCHES,
  INITIAL_BOM,
  INITIAL_GROUPS,
  INITIAL_LABOR,
  INITIAL_MATERIALS,
  INITIAL_OVERHEAD,
  INITIAL_PRODUCTS,
  INITIAL_SCENARIOS,
  INITIAL_VARIANTS,
} from './initialData';
import { calculateCostPerConsumptionUnit } from '../engine/unitConversions';
import { calculateProductCostSummary } from '../engine/calculations';
import { checkSupabaseConnection } from './supabaseClient';

const STORAGE_PREFIX = 'costing_desk_v1_';

export type AppView =
  | 'dashboard'
  | 'all-products'
  | 'ungrouped'
  | 'group-detail'
  | 'product-workspace'
  | 'materials'
  | 'batches'
  | 'scenarios'
  | 'reports'
  | 'settings';

export interface CostingDeskState {
  currency: CurrencyCode;
  groups: ProductGroup[];
  materials: MasterMaterial[];
  products: Product[];
  variants: ProductVariant[];
  bom: BomComponent[];
  labor: ProductionProcessStage[];
  overhead: OverheadItem[];
  batches: ProductionBatch[];
  scenarios: Scenario[];
  activeView: AppView;
  selectedGroupId: string | null;
  selectedProductId: string | null;
  selectedVariantId: string | null;
  searchQuery: string;
  sidebarCollapsed: boolean;
  expandedGroupIds: Record<string, boolean>;
  supabaseStatus: {
    connected: boolean;
    message: string;
    userEmail: string | null;
  };
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage save failed:', err);
  }
}

// Initial default state
const initialAppState: CostingDeskState = {
  currency: loadFromStorage<CurrencyCode>('currency', 'IDR'),
  groups: loadFromStorage<ProductGroup[]>('groups', INITIAL_GROUPS),
  materials: loadFromStorage<MasterMaterial[]>('materials', INITIAL_MATERIALS),
  products: loadFromStorage<Product[]>('products', INITIAL_PRODUCTS),
  variants: loadFromStorage<ProductVariant[]>('variants', INITIAL_VARIANTS),
  bom: loadFromStorage<BomComponent[]>('bom', INITIAL_BOM),
  labor: loadFromStorage<ProductionProcessStage[]>('labor', INITIAL_LABOR),
  overhead: loadFromStorage<OverheadItem[]>('overhead', INITIAL_OVERHEAD),
  batches: loadFromStorage<ProductionBatch[]>('batches', INITIAL_BATCHES),
  scenarios: loadFromStorage<Scenario[]>('scenarios', INITIAL_SCENARIOS),
  activeView: 'dashboard',
  selectedGroupId: null,
  selectedProductId: null,
  selectedVariantId: null,
  searchQuery: '',
  sidebarCollapsed: loadFromStorage<boolean>('sidebar_collapsed', false),
  expandedGroupIds: loadFromStorage<Record<string, boolean>>('expanded_groups', {
    'grp-line-a': true,
    'grp-apparel': true,
  }),
  supabaseStatus: {
    connected: false,
    message: 'Initializing...',
    userEmail: null,
  },
};

// Simple singleton pub/sub store for React
let currentState: CostingDeskState = initialAppState;
const listeners = new Set<(state: CostingDeskState) => void>();

function notify() {
  listeners.forEach((listener) => listener(currentState));
}

function updateState(updater: (prev: CostingDeskState) => CostingDeskState) {
  currentState = updater(currentState);
  notify();
}

// React hook
export function useCostingStore() {
  const [state, setState] = useState<CostingDeskState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

// Check Supabase connection on startup
export async function refreshSupabaseConnection() {
  const res = await checkSupabaseConnection();
  updateState((prev) => ({
    ...prev,
    supabaseStatus: {
      connected: res.connected,
      message: res.message,
      userEmail: res.user?.email || null,
    },
  }));
}

refreshSupabaseConnection();

// Store Actions API
export const costingActions = {
  // Navigation
  setView(view: AppView) {
    updateState((prev) => ({ ...prev, activeView: view }));
  },

  setCurrency(currency: CurrencyCode) {
    saveToStorage('currency', currency);
    updateState((prev) => ({ ...prev, currency }));
  },

  setSearchQuery(searchQuery: string) {
    updateState((prev) => ({ ...prev, searchQuery }));
  },

  setSidebarCollapsed(collapsed: boolean) {
    saveToStorage('sidebar_collapsed', collapsed);
    updateState((prev) => ({ ...prev, sidebarCollapsed: collapsed }));
  },

  toggleGroupExpand(groupId: string) {
    updateState((prev) => {
      const next = {
        ...prev.expandedGroupIds,
        [groupId]: !prev.expandedGroupIds[groupId],
      };
      saveToStorage('expanded_groups', next);
      return { ...prev, expandedGroupIds: next };
    });
  },

  openGroup(groupId: string) {
    updateState((prev) => ({
      ...prev,
      selectedGroupId: groupId,
      activeView: 'group-detail',
    }));
  },

  openProduct(productId: string, variantId?: string) {
    updateState((prev) => {
      const productVariants = prev.variants.filter((v) => v.productId === productId);
      const targetVariantId = variantId || productVariants[0]?.id || null;
      return {
        ...prev,
        selectedProductId: productId,
        selectedVariantId: targetVariantId,
        activeView: 'product-workspace',
      };
    });
  },

  selectVariant(variantId: string) {
    updateState((prev) => ({ ...prev, selectedVariantId: variantId }));
  },

  // Groups
  addGroup(name: string, description?: string) {
    const newGroup: ProductGroup = {
      id: 'grp-' + Date.now(),
      name: name.trim(),
      description: description?.trim(),
      orderIndex: currentState.groups.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextGroups = [...currentState.groups, newGroup];
    saveToStorage('groups', nextGroups);
    updateState((prev) => ({
      ...prev,
      groups: nextGroups,
      selectedGroupId: newGroup.id,
      activeView: 'group-detail',
    }));
    return newGroup;
  },

  updateGroup(groupId: string, name: string, description?: string) {
    const nextGroups = currentState.groups.map((g) =>
      g.id === groupId
        ? { ...g, name: name.trim(), description: description?.trim(), updatedAt: new Date().toISOString() }
        : g
    );
    saveToStorage('groups', nextGroups);
    updateState((prev) => ({ ...prev, groups: nextGroups }));
  },

  deleteGroup(groupId: string) {
    // Ungroup products that were in this group
    const nextProducts = currentState.products.map((p) =>
      p.groupId === groupId ? { ...p, groupId: null, updatedAt: new Date().toISOString() } : p
    );
    const nextGroups = currentState.groups.filter((g) => g.id !== groupId);
    saveToStorage('groups', nextGroups);
    saveToStorage('products', nextProducts);
    updateState((prev) => ({
      ...prev,
      groups: nextGroups,
      products: nextProducts,
      selectedGroupId: null,
      activeView: prev.selectedGroupId === groupId ? 'all-products' : prev.activeView,
    }));
  },

  // Products
  addProduct(
    name: string,
    code: string,
    category: string,
    groupId: string | null = null,
    description?: string,
    initialVariantName = 'Standard',
    plannedQuantity = 100
  ) {
    const prodId = 'prod-' + Date.now();
    const varId = 'var-' + Date.now();

    const newProduct: Product = {
      id: prodId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      category: category.trim() || 'General',
      groupId,
      description: description?.trim(),
      productionDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newVariant: ProductVariant = {
      id: varId,
      productId: prodId,
      name: initialVariantName,
      sku: `${newProduct.code}-01`,
      measurementUnit: 'pcs',
      plannedQuantity,
      actualQuantity: plannedQuantity,
      targetFinishedQuantity: plannedQuantity,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = [newProduct, ...currentState.products];
    const nextVariants = [newVariant, ...currentState.variants];

    saveToStorage('products', nextProducts);
    saveToStorage('variants', nextVariants);

    updateState((prev) => ({
      ...prev,
      products: nextProducts,
      variants: nextVariants,
      selectedProductId: prodId,
      selectedVariantId: varId,
      activeView: 'product-workspace',
    }));

    return { product: newProduct, variant: newVariant };
  },

  updateProduct(productId: string, updates: Partial<Product>) {
    const nextProducts = currentState.products.map((p) =>
      p.id === productId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    saveToStorage('products', nextProducts);
    updateState((prev) => ({ ...prev, products: nextProducts }));
  },

  moveProductToGroup(productId: string, targetGroupId: string | null) {
    const nextProducts = currentState.products.map((p) =>
      p.id === productId ? { ...p, groupId: targetGroupId, updatedAt: new Date().toISOString() } : p
    );
    saveToStorage('products', nextProducts);
    updateState((prev) => ({ ...prev, products: nextProducts }));
  },

  deleteProduct(productId: string) {
    const variantIds = currentState.variants
      .filter((v) => v.productId === productId)
      .map((v) => v.id);

    const nextProducts = currentState.products.filter((p) => p.id !== productId);
    const nextVariants = currentState.variants.filter((v) => v.productId !== productId);
    const nextBom = currentState.bom.filter((b) => !variantIds.includes(b.variantId));
    const nextLabor = currentState.labor.filter((l) => !variantIds.includes(l.variantId));
    const nextOverhead = currentState.overhead.filter((o) => !variantIds.includes(o.variantId));

    saveToStorage('products', nextProducts);
    saveToStorage('variants', nextVariants);
    saveToStorage('bom', nextBom);
    saveToStorage('labor', nextLabor);
    saveToStorage('overhead', nextOverhead);

    updateState((prev) => ({
      ...prev,
      products: nextProducts,
      variants: nextVariants,
      bom: nextBom,
      labor: nextLabor,
      overhead: nextOverhead,
      selectedProductId: null,
      selectedVariantId: null,
      activeView: prev.selectedProductId === productId ? 'all-products' : prev.activeView,
    }));
  },

  duplicateProduct(productId: string) {
    const original = currentState.products.find((p) => p.id === productId);
    if (!original) return;

    const newProdId = 'prod-' + Date.now();
    const dupProduct: Product = {
      ...original,
      id: newProdId,
      name: `${original.name} (Copy)`,
      code: `${original.code}-COPY`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const originalVariants = currentState.variants.filter((v) => v.productId === productId);
    const newVariants: ProductVariant[] = [];
    const newBom: BomComponent[] = [];
    const newLabor: ProductionProcessStage[] = [];
    const newOverhead: OverheadItem[] = [];

    originalVariants.forEach((v, idx) => {
      const newVarId = `var-${Date.now()}-${idx}`;
      newVariants.push({
        ...v,
        id: newVarId,
        productId: newProdId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // copy bom
      currentState.bom
        .filter((b) => b.variantId === v.id)
        .forEach((b, bIdx) => {
          newBom.push({
            ...b,
            id: `bom-${Date.now()}-${bIdx}`,
            variantId: newVarId,
          });
        });

      // copy labor
      currentState.labor
        .filter((l) => l.variantId === v.id)
        .forEach((l, lIdx) => {
          newLabor.push({
            ...l,
            id: `lab-${Date.now()}-${lIdx}`,
            variantId: newVarId,
          });
        });

      // copy overhead
      currentState.overhead
        .filter((o) => o.variantId === v.id)
        .forEach((o, oIdx) => {
          newOverhead.push({
            ...o,
            id: `ovh-${Date.now()}-${oIdx}`,
            variantId: newVarId,
          });
        });
    });

    const nextProducts = [dupProduct, ...currentState.products];
    const nextVariants = [...newVariants, ...currentState.variants];
    const nextBomList = [...newBom, ...currentState.bom];
    const nextLaborList = [...newLabor, ...currentState.labor];
    const nextOverheadList = [...newOverhead, ...currentState.overhead];

    saveToStorage('products', nextProducts);
    saveToStorage('variants', nextVariants);
    saveToStorage('bom', nextBomList);
    saveToStorage('labor', nextLaborList);
    saveToStorage('overhead', nextOverheadList);

    updateState((prev) => ({
      ...prev,
      products: nextProducts,
      variants: nextVariants,
      bom: nextBomList,
      labor: nextLaborList,
      overhead: nextOverheadList,
      selectedProductId: newProdId,
      selectedVariantId: newVariants[0]?.id || null,
      activeView: 'product-workspace',
    }));
  },

  // Variants
  addVariant(productId: string, name: string, sku?: string, sizeWeightVolume?: number, unit = 'pcs') {
    const newVarId = 'var-' + Date.now();
    const newVariant: ProductVariant = {
      id: newVarId,
      productId,
      name: name.trim(),
      sku: sku?.trim() || `VAR-${Date.now().toString().slice(-4)}`,
      sizeWeightVolume,
      measurementUnit: unit,
      plannedQuantity: 100,
      actualQuantity: 100,
      targetFinishedQuantity: 100,
      wastagePercentage: 0,
      defectiveQuantity: 0,
      reworkQuantity: 0,
      yieldPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextVariants = [...currentState.variants, newVariant];
    saveToStorage('variants', nextVariants);
    updateState((prev) => ({
      ...prev,
      variants: nextVariants,
      selectedVariantId: newVarId,
    }));
    return newVariant;
  },

  updateVariant(variantId: string, updates: Partial<ProductVariant>) {
    const nextVariants = currentState.variants.map((v) =>
      v.id === variantId ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    );
    saveToStorage('variants', nextVariants);
    updateState((prev) => ({ ...prev, variants: nextVariants }));
  },

  deleteVariant(variantId: string) {
    const target = currentState.variants.find((v) => v.id === variantId);
    if (!target) return;

    const remainingForProduct = currentState.variants.filter(
      (v) => v.productId === target.productId && v.id !== variantId
    );
    if (remainingForProduct.length === 0) {
      alert('A product must have at least one variant.');
      return;
    }

    const nextVariants = currentState.variants.filter((v) => v.id !== variantId);
    const nextBom = currentState.bom.filter((b) => b.variantId !== variantId);
    const nextLabor = currentState.labor.filter((l) => l.variantId !== variantId);
    const nextOverhead = currentState.overhead.filter((o) => o.variantId !== variantId);

    saveToStorage('variants', nextVariants);
    saveToStorage('bom', nextBom);
    saveToStorage('labor', nextLabor);
    saveToStorage('overhead', nextOverhead);

    updateState((prev) => ({
      ...prev,
      variants: nextVariants,
      bom: nextBom,
      labor: nextLabor,
      overhead: nextOverhead,
      selectedVariantId: remainingForProduct[0].id,
    }));
  },

  // Master Materials
  addMaterial(material: Omit<MasterMaterial, 'id' | 'lastUpdated'>) {
    const newMat: MasterMaterial = {
      ...material,
      id: 'mat-' + Date.now(),
      lastUpdated: new Date().toISOString(),
    };
    const nextMaterials = [newMat, ...currentState.materials];
    saveToStorage('materials', nextMaterials);
    updateState((prev) => ({ ...prev, materials: nextMaterials }));
    return newMat;
  },

  updateMaterial(materialId: string, updates: Partial<MasterMaterial>) {
    const nextMaterials = currentState.materials.map((m) =>
      m.id === materialId
        ? { ...m, ...updates, lastUpdated: new Date().toISOString() }
        : m
    );
    saveToStorage('materials', nextMaterials);

    // Update prices in active draft BOMs linked to this material (Test F isolation: does NOT change finalized batches!)
    const targetMat = nextMaterials.find((m) => m.id === materialId);
    let nextBom = currentState.bom;
    if (targetMat) {
      const derivedUnitCost = calculateCostPerConsumptionUnit(
        targetMat.purchasePrice,
        targetMat.conversionFactor
      );
      nextBom = currentState.bom.map((b) => {
        if (b.materialId === materialId) {
          return {
            ...b,
            unitPrice: derivedUnitCost,
          };
        }
        return b;
      });
      saveToStorage('bom', nextBom);
    }

    updateState((prev) => ({
      ...prev,
      materials: nextMaterials,
      bom: nextBom,
    }));
  },

  deleteMaterial(materialId: string) {
    const nextMaterials = currentState.materials.filter((m) => m.id !== materialId);
    // Unlink from BOMs without deleting the component
    const nextBom = currentState.bom.map((b) =>
      b.materialId === materialId ? { ...b, materialId: null } : b
    );
    saveToStorage('materials', nextMaterials);
    saveToStorage('bom', nextBom);
    updateState((prev) => ({ ...prev, materials: nextMaterials, bom: nextBom }));
  },

  // BOM Components
  addBomComponent(component: Omit<BomComponent, 'id'>) {
    const newComp: BomComponent = {
      ...component,
      id: 'bom-' + Date.now(),
    };
    const nextBom = [...currentState.bom, newComp];
    saveToStorage('bom', nextBom);
    updateState((prev) => ({ ...prev, bom: nextBom }));
    return newComp;
  },

  updateBomComponent(componentId: string, updates: Partial<BomComponent>) {
    const nextBom = currentState.bom.map((b) =>
      b.id === componentId ? { ...b, ...updates } : b
    );
    saveToStorage('bom', nextBom);
    updateState((prev) => ({ ...prev, bom: nextBom }));
  },

  deleteBomComponent(componentId: string) {
    const nextBom = currentState.bom.filter((b) => b.id !== componentId);
    saveToStorage('bom', nextBom);
    updateState((prev) => ({ ...prev, bom: nextBom }));
  },

  duplicateBomComponent(componentId: string) {
    const target = currentState.bom.find((b) => b.id === componentId);
    if (!target) return;
    const dup: BomComponent = {
      ...target,
      id: 'bom-' + Date.now(),
      name: `${target.name} (Copy)`,
    };
    const nextBom = [...currentState.bom, dup];
    saveToStorage('bom', nextBom);
    updateState((prev) => ({ ...prev, bom: nextBom }));
  },

  // Labor
  addLaborStage(stage: Omit<ProductionProcessStage, 'id'>) {
    const newStage: ProductionProcessStage = {
      ...stage,
      id: 'lab-' + Date.now(),
    };
    const nextLabor = [...currentState.labor, newStage];
    saveToStorage('labor', nextLabor);
    updateState((prev) => ({ ...prev, labor: nextLabor }));
    return newStage;
  },

  updateLaborStage(stageId: string, updates: Partial<ProductionProcessStage>) {
    const nextLabor = currentState.labor.map((l) =>
      l.id === stageId ? { ...l, ...updates } : l
    );
    saveToStorage('labor', nextLabor);
    updateState((prev) => ({ ...prev, labor: nextLabor }));
  },

  deleteLaborStage(stageId: string) {
    const nextLabor = currentState.labor.filter((l) => l.id !== stageId);
    saveToStorage('labor', nextLabor);
    updateState((prev) => ({ ...prev, labor: nextLabor }));
  },

  // Overhead
  addOverheadItem(item: Omit<OverheadItem, 'id'>) {
    const newItem: OverheadItem = {
      ...item,
      id: 'ovh-' + Date.now(),
    };
    const nextOverhead = [...currentState.overhead, newItem];
    saveToStorage('overhead', nextOverhead);
    updateState((prev) => ({ ...prev, overhead: nextOverhead }));
    return newItem;
  },

  updateOverheadItem(itemId: string, updates: Partial<OverheadItem>) {
    const nextOverhead = currentState.overhead.map((o) =>
      o.id === itemId ? { ...o, ...updates } : o
    );
    saveToStorage('overhead', nextOverhead);
    updateState((prev) => ({ ...prev, overhead: nextOverhead }));
  },

  deleteOverheadItem(itemId: string) {
    const nextOverhead = currentState.overhead.filter((o) => o.id !== itemId);
    saveToStorage('overhead', nextOverhead);
    updateState((prev) => ({ ...prev, overhead: nextOverhead }));
  },

  // Batches & Snapshots (Preserves historical prices)
  finalizeBatch(productId: string, variantId: string, batchNumber: string, notes?: string) {
    const product = currentState.products.find((p) => p.id === productId);
    const variant = currentState.variants.find((v) => v.id === variantId);
    if (!product || !variant) return null;

    const variantBom = currentState.bom.filter((b) => b.variantId === variantId);
    const variantLabor = currentState.labor.filter((l) => l.variantId === variantId);
    const variantOverhead = currentState.overhead.filter((o) => o.variantId === variantId);

    const summary = calculateProductCostSummary(
      variant,
      variantBom,
      variantLabor,
      variantOverhead,
      currentState.materials
    );

    // Capture exact price snapshots used
    const snapshots = variantBom.map((comp) => {
      const mat = currentState.materials.find((m) => m.id === comp.materialId);
      return {
        materialId: comp.materialId,
        materialName: comp.name,
        purchasePrice: mat?.purchasePrice || comp.unitPrice,
        purchaseUnit: mat?.purchaseUnit || comp.unit,
        unitPriceUsed: comp.unitPrice,
        consumptionUnit: comp.unit,
      };
    });

    const newBatch: ProductionBatch = {
      id: 'batch-' + Date.now(),
      batchNumber: batchNumber.trim(),
      productId,
      variantId,
      productName: product.name,
      variantName: variant.name,
      plannedQuantity: variant.plannedQuantity,
      actualFinishedQuantity: summary.actualFinishedQuantity,
      status: 'finalized',
      finalizedAt: new Date().toISOString(),
      priceSnapshots: snapshots,
      totalProductionCost: summary.totalProductionCost,
      unitHpp: summary.unitHpp,
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextBatches = [newBatch, ...currentState.batches];
    saveToStorage('batches', nextBatches);
    updateState((prev) => ({ ...prev, batches: nextBatches }));
    return newBatch;
  },

  deleteBatch(batchId: string) {
    const nextBatches = currentState.batches.filter((b) => b.id !== batchId);
    saveToStorage('batches', nextBatches);
    updateState((prev) => ({ ...prev, batches: nextBatches }));
  },

  // Scenarios
  addScenario(scenario: Omit<Scenario, 'id' | 'createdAt'>) {
    const newScenario: Scenario = {
      ...scenario,
      id: 'scen-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const nextScenarios = [newScenario, ...currentState.scenarios];
    saveToStorage('scenarios', nextScenarios);
    updateState((prev) => ({ ...prev, scenarios: nextScenarios }));
    return newScenario;
  },

  updateScenario(scenarioId: string, updates: Partial<Scenario>) {
    const nextScenarios = currentState.scenarios.map((s) =>
      s.id === scenarioId ? { ...s, ...updates } : s
    );
    saveToStorage('scenarios', nextScenarios);
    updateState((prev) => ({ ...prev, scenarios: nextScenarios }));
  },

  deleteScenario(scenarioId: string) {
    const nextScenarios = currentState.scenarios.filter((s) => s.id !== scenarioId);
    saveToStorage('scenarios', nextScenarios);
    updateState((prev) => ({ ...prev, scenarios: nextScenarios }));
  },

  // Full System Export / Backup & Reset
  exportFullBackupJson(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        currency: currentState.currency,
        groups: currentState.groups,
        materials: currentState.materials,
        products: currentState.products,
        variants: currentState.variants,
        bom: currentState.bom,
        labor: currentState.labor,
        overhead: currentState.overhead,
        batches: currentState.batches,
        scenarios: currentState.scenarios,
      },
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) return false;
      const d = parsed.data;

      if (d.currency) saveToStorage('currency', d.currency);
      if (d.groups) saveToStorage('groups', d.groups);
      if (d.materials) saveToStorage('materials', d.materials);
      if (d.products) saveToStorage('products', d.products);
      if (d.variants) saveToStorage('variants', d.variants);
      if (d.bom) saveToStorage('bom', d.bom);
      if (d.labor) saveToStorage('labor', d.labor);
      if (d.overhead) saveToStorage('overhead', d.overhead);
      if (d.batches) saveToStorage('batches', d.batches);
      if (d.scenarios) saveToStorage('scenarios', d.scenarios);

      updateState((prev) => ({
        ...prev,
        currency: d.currency || prev.currency,
        groups: d.groups || prev.groups,
        materials: d.materials || prev.materials,
        products: d.products || prev.products,
        variants: d.variants || prev.variants,
        bom: d.bom || prev.bom,
        labor: d.labor || prev.labor,
        overhead: d.overhead || prev.overhead,
        batches: d.batches || prev.batches,
        scenarios: d.scenarios || prev.scenarios,
      }));
      return true;
    } catch {
      return false;
    }
  },

  resetToInitialSampleData() {
    saveToStorage('groups', INITIAL_GROUPS);
    saveToStorage('materials', INITIAL_MATERIALS);
    saveToStorage('products', INITIAL_PRODUCTS);
    saveToStorage('variants', INITIAL_VARIANTS);
    saveToStorage('bom', INITIAL_BOM);
    saveToStorage('labor', INITIAL_LABOR);
    saveToStorage('overhead', INITIAL_OVERHEAD);
    saveToStorage('batches', INITIAL_BATCHES);
    saveToStorage('scenarios', INITIAL_SCENARIOS);

    updateState((prev) => ({
      ...prev,
      groups: INITIAL_GROUPS,
      materials: INITIAL_MATERIALS,
      products: INITIAL_PRODUCTS,
      variants: INITIAL_VARIANTS,
      bom: INITIAL_BOM,
      labor: INITIAL_LABOR,
      overhead: INITIAL_OVERHEAD,
      batches: INITIAL_BATCHES,
      scenarios: INITIAL_SCENARIOS,
    }));
  },
};
