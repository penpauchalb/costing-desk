import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BomComponent,
  CurrencyCode,
  MasterMaterial,
  OverheadItem,
  Product,
  ProductGroup,
  ProductionProcessStage,
  ProductVariant,
} from '../types';
import {
  calculateBomComponentCost,
  calculateProductCostSummary,
  calculateLaborStageCost,
  calculateOverheadItemCost,
} from './calculations';

export function formatCurrencyValue(amount: number, currency: CurrencyCode): string {
  if (currency === 'IDR') {
    return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
  } else if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'EUR') {
    return `€${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'SGD') {
    return `S$${amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export interface PdfExportOptions {
  title?: string;
  currency: CurrencyCode;
  product?: Product;
  variant?: ProductVariant;
  group?: ProductGroup;
  allProducts?: Product[];
  allVariants?: ProductVariant[];
  allGroups?: ProductGroup[];
  bom?: BomComponent[];
  labor?: ProductionProcessStage[];
  overhead?: OverheadItem[];
  materials?: MasterMaterial[];
  exportType: 'single_product' | 'group' | 'consolidated_all';
}

export function generateCostingPdfReport(options: PdfExportOptions): void {
  const {
    currency,
    product,
    variant,
    group,
    allProducts = [],
    allVariants = [],
    allGroups = [],
    bom = [],
    labor = [],
    overhead = [],
    materials = [],
    exportType,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // --- BRAND HEADER ---
  doc.setFillColor(2, 132, 199); // Sky blue #0284C7
  doc.rect(0, 0, pageWidth, 55, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COSTING DESK', 40, 32);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('UNIVERSAL HPP & PRODUCT COSTING REPORT', 40, 45);

  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr}`, pageWidth - 40, 32, { align: 'right' });
  doc.text(`Currency: ${currency}`, pageWidth - 40, 45, { align: 'right' });

  // --------------------------------------------------------------------------
  // SINGLE PRODUCT EXPORT
  // --------------------------------------------------------------------------
  if (exportType === 'single_product' && product && variant) {
    const varBom = bom.filter((b) => b.variantId === variant.id);
    const varLabor = labor.filter((l) => l.variantId === variant.id);
    const varOverhead = overhead.filter((o) => o.variantId === variant.id);

    const summary = calculateProductCostSummary(variant, varBom, varLabor, varOverhead, materials);
    const groupName = product.groupId
      ? allGroups.find((g) => g.id === product.groupId)?.name || 'Group'
      : 'Ungrouped';

    // Metadata Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 75, pageWidth - 80, 80, 4, 4, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(product.name, 55, 96);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Variant: ${variant.name} (${variant.sku})`, 55, 112);
    doc.text(`Group: ${groupName}`, 55, 126);
    doc.text(`Category: ${product.category}`, 55, 140);

    doc.text(`Planned Qty: ${variant.plannedQuantity} units`, 280, 112);
    doc.text(`Finished Qty: ${summary.actualFinishedQuantity} units`, 280, 126);
    doc.text(`Batch: ${product.productionBatch || '—'}`, 280, 140);

    // HPP Highlight Box
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(pageWidth - 190, 85, 135, 60, 4, 4, 'FD');

    doc.setTextColor(3, 105, 161);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('HPP PER FINISHED UNIT', pageWidth - 122, 102, { align: 'center' });

    doc.setFontSize(14);
    doc.text(formatCurrencyValue(summary.unitHpp, currency), pageWidth - 122, 124, {
      align: 'center',
    });

    let currentY = 175;

    // 1. BOM Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1. Bill of Materials & Components', 40, currentY);

    const bomTableBody = varBom.map((item) => {
      const { costPerFinishedUnit, totalCost } = calculateBomComponentCost(
        item,
        summary.actualFinishedQuantity,
        materials
      );
      return [
        item.name,
        item.category.replace('_', ' '),
        `${item.quantityRequired} ${item.unit}`,
        formatCurrencyValue(item.unitPrice, currency),
        formatCurrencyValue(costPerFinishedUnit, currency),
        formatCurrencyValue(totalCost, currency),
      ];
    });

    autoTable(doc, {
      startY: currentY + 8,
      margin: { left: 40, right: 40 },
      head: [['Component', 'Category', 'Qty / Unit', 'Unit Price', 'Cost / Unit', 'Total Cost']],
      body: bomTableBody.length > 0 ? bomTableBody : [['No BOM components registered', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 25;

    // 2. Labor & Services Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Labor & Production Services', 40, currentY);

    const laborTableBody = varLabor.map((stg) => {
      const { costPerFinishedUnit, totalCost } = calculateLaborStageCost(
        stg,
        summary.actualFinishedQuantity
      );
      return [
        stg.stageName,
        stg.costMethod.replace('_', ' '),
        formatCurrencyValue(stg.rate, currency),
        formatCurrencyValue(costPerFinishedUnit, currency),
        formatCurrencyValue(totalCost, currency),
      ];
    });

    autoTable(doc, {
      startY: currentY + 8,
      margin: { left: 40, right: 40 },
      head: [['Stage / Service', 'Method', 'Rate', 'Cost / Unit', 'Total Cost']],
      body: laborTableBody.length > 0 ? laborTableBody : [['No direct labor stages added', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 25;

    // 3. Overhead Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Overhead & Operational Expenses', 40, currentY);

    const overheadTableBody = varOverhead.map((ovh) => {
      const { costPerFinishedUnit, totalCost } = calculateOverheadItemCost(
        ovh,
        summary.actualFinishedQuantity,
        {
          materials: summary.rawMaterialsTotal + summary.packagingTotal,
          labor: summary.laborTotal,
          directCosts: summary.rawMaterialsTotal + summary.packagingTotal + summary.laborTotal,
        }
      );
      return [
        ovh.name,
        ovh.allocationMethod.replace('_', ' '),
        ovh.includeInHpp ? 'Yes' : 'No (Separate)',
        formatCurrencyValue(costPerFinishedUnit, currency),
        formatCurrencyValue(totalCost, currency),
      ];
    });

    autoTable(doc, {
      startY: currentY + 8,
      margin: { left: 40, right: 40 },
      head: [['Expense Item', 'Allocation', 'In HPP', 'Cost / Unit', 'Total Expense']],
      body: overheadTableBody.length > 0 ? overheadTableBody : [['No overhead items added', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 20;

    // Final Cost Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(pageWidth - 280, currentY, 240, 85, 4, 4, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Raw Materials & Packaging:', pageWidth - 270, currentY + 18);
    doc.text(
      formatCurrencyValue(summary.rawMaterialsTotal + summary.packagingTotal, currency),
      pageWidth - 50,
      currentY + 18,
      { align: 'right' }
    );

    doc.text('Labor & Production Services:', pageWidth - 270, currentY + 34);
    doc.text(formatCurrencyValue(summary.laborTotal, currency), pageWidth - 50, currentY + 34, {
      align: 'right',
    });

    doc.text('Overhead & Operations:', pageWidth - 270, currentY + 50);
    doc.text(formatCurrencyValue(summary.overheadTotal, currency), pageWidth - 50, currentY + 50, {
      align: 'right',
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Total Production Budget:', pageWidth - 270, currentY + 70);
    doc.text(
      formatCurrencyValue(summary.totalProductionCost, currency),
      pageWidth - 50,
      currentY + 70,
      { align: 'right' }
    );
  }

  // --------------------------------------------------------------------------
  // GROUP OR CONSOLIDATED REPORT
  // --------------------------------------------------------------------------
  else {
    const reportTitle =
      exportType === 'group' && group
        ? `Product Group Report: ${group.name}`
        : 'Consolidated Costing & HPP Overview';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle, 40, 85);

    const relevantVariants =
      exportType === 'group' && group
        ? allVariants.filter((v) => {
            const p = allProducts.find((prod) => prod.id === v.productId);
            return p?.groupId === group.id;
          })
        : allVariants;

    let totalGroupUnits = 0;
    let totalGroupCost = 0;

    const tableRows = relevantVariants.map((v) => {
      const prod = allProducts.find((p) => p.id === v.productId);
      const groupObj = prod?.groupId ? allGroups.find((g) => g.id === prod.groupId) : null;
      const varBom = bom.filter((b) => b.variantId === v.id);
      const varLabor = labor.filter((l) => l.variantId === v.id);
      const varOverhead = overhead.filter((o) => o.variantId === v.id);

      const summary = calculateProductCostSummary(v, varBom, varLabor, varOverhead, materials);

      totalGroupUnits += summary.actualFinishedQuantity;
      totalGroupCost += summary.totalProductionCost;

      return [
        prod?.name || '—',
        groupObj?.name || 'Ungrouped',
        v.name,
        summary.actualFinishedQuantity.toLocaleString(),
        formatCurrencyValue(summary.unitHpp, currency),
        formatCurrencyValue(summary.totalProductionCost, currency),
      ];
    });

    autoTable(doc, {
      startY: 105,
      margin: { left: 40, right: 40 },
      head: [['Product Name', 'Group', 'Variant', 'Units', `HPP / Unit (${currency})`, 'Total Cost']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    const finalY = doc.lastAutoTable.finalY + 20;
    const weightedHpp = totalGroupUnits > 0 ? totalGroupCost / totalGroupUnits : 0;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(40, finalY, pageWidth - 80, 50, 4, 4, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Finished Units: ${totalGroupUnits.toLocaleString()}`, 55, finalY + 20);
    doc.text(
      `Total Production Cost: ${formatCurrencyValue(totalGroupCost, currency)}`,
      55,
      finalY + 36
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text(
      `Weighted Average HPP: ${formatCurrencyValue(weightedHpp, currency)} / unit`,
      pageWidth - 55,
      finalY + 28,
      { align: 'right' }
    );
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Costing Desk — Page ${i} of ${pageCount} | Universal Product Costing System`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  doc.save(`CostingDesk_Report_${Date.now()}.pdf`);
}
