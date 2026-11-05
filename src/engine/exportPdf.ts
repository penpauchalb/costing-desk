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

function drawBrandHeader(doc: jsPDF, title: string, subtitle: string, rightText1: string, rightText2: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(2, 132, 199); // Sky blue #0284C7
  doc.rect(0, 0, pageWidth, 52, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 28);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 40, 42);

  doc.setFontSize(8.5);
  doc.text(rightText1, pageWidth - 40, 28, { align: 'right' });
  doc.text(rightText2, pageWidth - 40, 42, { align: 'right' });
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

  // ==========================================================================
  // 1. SINGLE PRODUCT EXPORT
  // ==========================================================================
  if (exportType === 'single_product' && product && variant) {
    drawBrandHeader(
      doc,
      'COSTING DESK',
      'PRODUCT COSTING & HPP REPORT',
      `Date: ${dateStr}`,
      `Currency: ${currency}`
    );

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
    doc.roundedRect(40, 68, pageWidth - 80, 75, 4, 4, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(product.name, 55, 88);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Variant: ${variant.name} (${variant.sku})`, 55, 104);
    doc.text(`Group: ${groupName} | Category: ${product.category}`, 55, 118);
    doc.text(`Net Size: ${variant.sizeWeightVolume || ''} ${variant.measurementUnit || ''}`, 55, 132);

    doc.text(`Planned Batch Qty: ${variant.plannedQuantity} units`, 280, 104);
    doc.text(`Finished Output: ${summary.actualFinishedQuantity} units`, 280, 118);
    doc.text(`Yield / Wastage: ${variant.yieldPercentage ?? 100}% / ${variant.wastagePercentage ?? 0}%`, 280, 132);

    // HPP Highlight Box
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(pageWidth - 190, 78, 135, 55, 4, 4, 'FD');

    doc.setTextColor(3, 105, 161);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('HPP PER FINISHED UNIT', pageWidth - 122, 94, { align: 'center' });

    doc.setFontSize(13);
    doc.text(formatCurrencyValue(summary.unitHpp, currency), pageWidth - 122, 115, {
      align: 'center',
    });

    let currentY = 160;

    // 1. Raw Materials & Packaging Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1. Bill of Materials & Packaging Components', 40, currentY);

    const bomTableBody = varBom.map((item) => {
      const compCost = calculateBomComponentCost(item, summary.actualFinishedQuantity, materials);
      const usageFormatted = `${compCost.effectivePurchasePrice > 0 ? formatCurrencyValue(compCost.effectivePurchasePrice, currency) : '—'} / ${compCost.effectivePurchaseUnit}`;
      const convFormatted = formatCurrencyValue(compCost.unitPrice, currency) + ' / ' + compCost.effectiveUsageUnit;

      return [
        item.name,
        item.category === 'packaging' ? 'Packaging' : 'Raw Material',
        `${item.usagePerProduct ?? item.quantityRequired} ${compCost.effectiveUsageUnit}`,
        usageFormatted,
        convFormatted,
        formatCurrencyValue(compCost.costPerFinishedUnit, currency),
        formatCurrencyValue(compCost.totalCost, currency),
      ];
    });

    autoTable(doc, {
      startY: currentY + 6,
      margin: { left: 40, right: 40 },
      head: [['Component Name', 'Category', 'Usage / Product', 'Purchase Price & Unit', 'Price / Usage Unit', 'Cost / Product', 'Total Batch Cost']],
      body: bomTableBody.length > 0 ? bomTableBody : [['No materials registered', '', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 18;

    // 2. Labor & Production Services
    if (varLabor.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Labor & Processing Services', 40, currentY);

      const laborTableBody = varLabor.map((stg) => {
        const { costPerFinishedUnit, totalCost } = calculateLaborStageCost(stg, summary.actualFinishedQuantity);
        return [
          stg.stageName,
          stg.costMethod.replace('_', ' '),
          formatCurrencyValue(stg.rate, currency),
          formatCurrencyValue(costPerFinishedUnit, currency),
          formatCurrencyValue(totalCost, currency),
        ];
      });

      autoTable(doc, {
        startY: currentY + 6,
        margin: { left: 40, right: 40 },
        head: [['Process / Stage', 'Method', 'Rate', 'Cost / Unit', 'Total Cost']],
        body: laborTableBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      });

      // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
      currentY = doc.lastAutoTable.finalY + 18;
    }

    // 3. Overhead Expenses
    if (varOverhead.length > 0) {
      doc.setFontSize(10);
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
          formatCurrencyValue(costPerFinishedUnit, currency),
          formatCurrencyValue(totalCost, currency),
        ];
      });

      autoTable(doc, {
        startY: currentY + 6,
        margin: { left: 40, right: 40 },
        head: [['Expense Item', 'Method', 'Cost / Unit', 'Total Expense']],
        body: overheadTableBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      });

      // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
      currentY = doc.lastAutoTable.finalY + 18;
    }

    // Final Cost Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(pageWidth - 280, currentY, 240, 85, 4, 4, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Raw Materials & Packaging:', pageWidth - 270, currentY + 18);
    doc.text(
      formatCurrencyValue(summary.rawMaterialsTotal + summary.packagingTotal, currency),
      pageWidth - 50,
      currentY + 18,
      { align: 'right' }
    );

    doc.text('Labor & Processing Services:', pageWidth - 270, currentY + 34);
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

  // ==========================================================================
  // 2. GROUP REPORT (EXECUTIVE SUMMARY + MULTI-PAGE DETAILED BREAKDOWN PER PRODUCT)
  // ==========================================================================
  else if (exportType === 'group' && group) {
    const groupProducts = allProducts.filter((p) => p.groupId === group.id);
    const relevantVariants = allVariants.filter((v) =>
      groupProducts.some((p) => p.id === v.productId)
    );

    // Calculate all variant summaries
    const variantSummaries = relevantVariants.map((v) => {
      const prod = groupProducts.find((p) => p.id === v.productId)!;
      const varBom = bom.filter((b) => b.variantId === v.id);
      const varLabor = labor.filter((l) => l.variantId === v.id);
      const varOverhead = overhead.filter((o) => o.variantId === v.id);
      const summary = calculateProductCostSummary(v, varBom, varLabor, varOverhead, materials);
      return {
        product: prod,
        variant: v,
        bom: varBom,
        labor: varLabor,
        overhead: varOverhead,
        summary,
      };
    });

    let totalGroupUnits = 0;
    let totalGroupCost = 0;
    let totalGroupRawMaterials = 0;
    let totalGroupPackaging = 0;
    let totalGroupLabor = 0;
    let totalGroupOverhead = 0;

    variantSummaries.forEach(({ summary }) => {
      totalGroupUnits += summary.actualFinishedQuantity;
      totalGroupCost += summary.totalProductionCost;
      totalGroupRawMaterials += summary.rawMaterialsTotal;
      totalGroupPackaging += summary.packagingTotal;
      totalGroupLabor += summary.laborTotal;
      totalGroupOverhead += summary.overheadTotal;
    });

    const weightedHpp = totalGroupUnits > 0 ? totalGroupCost / totalGroupUnits : 0;

    // ------------------------------------------------------------------------
    // PAGE 1: GROUP SUMMARY & EXECUTIVE OVERVIEW
    // ------------------------------------------------------------------------
    drawBrandHeader(
      doc,
      'COSTING DESK',
      'PRODUCT GROUP PRODUCTION BUDGET & HPP REPORT',
      `Date: ${dateStr}`,
      `Currency: ${currency}`
    );

    // Group Information Banner
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 68, pageWidth - 80, 60, 4, 4, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(group.name, 55, 90);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Category: ${group.category || 'General'} | Products in Group: ${groupProducts.length} (${relevantVariants.length} sizes)`, 55, 105);
    doc.text(group.description || 'Consolidated costing group and production budget overview.', 55, 119);

    // Financial KPI Summary Cards
    const cardY = 138;
    const cardWidth = (pageWidth - 80 - 15) / 2;

    // Card 1: Total Group Production Budget
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(40, cardY, cardWidth, 60, 4, 4, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text('TOTAL GROUP PRODUCTION BUDGET', 52, cardY + 16);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyValue(totalGroupCost, currency), 52, cardY + 38);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Across ${totalGroupUnits.toLocaleString()} total finished units in group`, 52, cardY + 50);

    // Card 2: Weighted Average HPP
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(40 + cardWidth + 15, cardY, cardWidth, 60, 4, 4, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('WEIGHTED AVERAGE HPP / UNIT', 40 + cardWidth + 27, cardY + 16);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyValue(weightedHpp, currency), 40 + cardWidth + 27, cardY + 38);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Per finished unit weighted production cost', 40 + cardWidth + 27, cardY + 50);

    // Cost Breakdown Strip
    const stripY = cardY + 68;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, stripY, pageWidth - 80, 26, 4, 4, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Raw Materials: ${formatCurrencyValue(totalGroupRawMaterials, currency)}   |   Packaging: ${formatCurrencyValue(totalGroupPackaging, currency)}   |   Labor: ${formatCurrencyValue(totalGroupLabor, currency)}   |   Overhead: ${formatCurrencyValue(totalGroupOverhead, currency)}`,
      pageWidth / 2,
      stripY + 16,
      { align: 'center' }
    );

    // Group Products Overview Table
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Product Line Summary & Cost Breakdown', 40, stripY + 45);

    const summaryTableRows = variantSummaries.map(({ product: prod, variant: v, summary }) => [
      prod.name,
      v.name + (v.sizeWeightVolume ? ` (${v.sizeWeightVolume}${v.measurementUnit})` : ''),
      summary.actualFinishedQuantity.toLocaleString() + ' ' + (v.measurementUnit || 'units'),
      formatCurrencyValue(summary.unitHpp, currency),
      formatCurrencyValue(summary.totalProductionCost, currency),
      `${((summary.totalProductionCost / (totalGroupCost || 1)) * 100).toFixed(1)}%`,
    ]);

    // Footer totals row
    summaryTableRows.push([
      'GROUP CONSOLIDATED TOTAL',
      `${variantSummaries.length} variants`,
      `${totalGroupUnits.toLocaleString()} units`,
      formatCurrencyValue(weightedHpp, currency) + ' (Avg)',
      formatCurrencyValue(totalGroupCost, currency),
      '100.0%',
    ]);

    autoTable(doc, {
      startY: stripY + 52,
      margin: { left: 40, right: 40 },
      head: [['Product Name', 'Variant / Package Size', 'Batch Quantity', 'HPP / Product', 'Total Product Budget', 'Share']],
      body: summaryTableRows,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      didParseCell: (data) => {
        if (data.row.index === summaryTableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 249, 255];
        }
      },
    });

    // ------------------------------------------------------------------------
    // PAGES 2+: INDIVIDUAL PRODUCT DETAIL SECTION FOR EVERY PRODUCT IN GROUP
    // ------------------------------------------------------------------------
    variantSummaries.forEach(({ product: prod, variant: v, bom: varBom, labor: varLabor, overhead: varOverhead, summary }, pIdx) => {
      doc.addPage();

      // Top Brand & Product Header
      drawBrandHeader(
        doc,
        'COSTING DESK',
        `ITEM DETAIL BREAKDOWN — ${pIdx + 1} OF ${variantSummaries.length}`,
        `Group: ${group.name}`,
        `Category: ${group.category || 'General'}`
      );

      // Product Title Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, 65, pageWidth - 80, 52, 4, 4, 'FD');

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${prod.name} — ${v.name}`, 55, 85);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `SKU: ${v.sku}   |   Batch Output: ${summary.actualFinishedQuantity.toLocaleString()} ${v.measurementUnit || 'units'}   |   Yield: ${v.yieldPercentage ?? 100}%   |   Wastage: ${v.wastagePercentage ?? 0}%`,
        55,
        102
      );

      // Mini Hero Stats
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      doc.text(
        `HPP: ${formatCurrencyValue(summary.unitHpp, currency)} / unit   |   Total Budget: ${formatCurrencyValue(summary.totalProductionCost, currency)}`,
        pageWidth - 55,
        85,
        { align: 'right' }
      );

      let curY = 128;

      // 1. Raw Materials Breakdown Table
      const rawMaterialsItems = varBom.filter((b) => b.category !== 'packaging');
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('A. Raw Materials (Bahan Baku)', 40, curY);

      const rawMaterialsRows = rawMaterialsItems.map((comp) => {
        const compCost = calculateBomComponentCost(comp, summary.actualFinishedQuantity, materials);
        let batchUsage = `${compCost.totalQuantityRequired.toLocaleString()} ${compCost.effectiveUsageUnit}`;
        if (
          (compCost.effectiveUsageUnit.toLowerCase() === 'g' || compCost.effectiveUsageUnit.toLowerCase() === 'gram') &&
          compCost.totalQuantityRequired >= 1000
        ) {
          batchUsage = `${(compCost.totalQuantityRequired / 1000).toLocaleString()} kg`;
        }

        return [
          comp.name,
          `${comp.usagePerProduct ?? comp.quantityRequired} ${compCost.effectiveUsageUnit}`,
          `${formatCurrencyValue(compCost.effectivePurchasePrice, currency)} / ${compCost.effectivePurchaseUnit}`,
          `${formatCurrencyValue(compCost.unitPrice, currency)} / ${compCost.effectiveUsageUnit}`,
          formatCurrencyValue(compCost.costPerFinishedUnit, currency),
          batchUsage,
          formatCurrencyValue(compCost.totalCost, currency),
        ];
      });

      if (rawMaterialsItems.length > 0) {
        rawMaterialsRows.push([
          'Subtotal Raw Materials',
          '',
          '',
          '',
          formatCurrencyValue(summary.rawMaterialsCostPerUnit, currency),
          '',
          formatCurrencyValue(summary.rawMaterialsTotal, currency),
        ]);
      }

      autoTable(doc, {
        startY: curY + 6,
        margin: { left: 40, right: 40 },
        head: [['Material Name', 'Usage / Product', 'Purchase Unit & Price', 'Price / Usage Unit', 'Cost / Product', 'Batch Usage', 'Total Batch Cost']],
        body: rawMaterialsRows.length > 0 ? rawMaterialsRows : [['No raw materials added', '', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        didParseCell: (data) => {
          if (rawMaterialsItems.length > 0 && data.row.index === rawMaterialsRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [248, 250, 252];
          }
        },
      });

      // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
      curY = doc.lastAutoTable.finalY + 16;

      // 2. Packaging Breakdown Table
      const packagingItems = varBom.filter((b) => b.category === 'packaging');
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('B. Packaging Components (Kemasan)', 40, curY);

      const packagingRows = packagingItems.map((comp) => {
        const compCost = calculateBomComponentCost(comp, summary.actualFinishedQuantity, materials);
        return [
          comp.name,
          `${comp.usagePerProduct ?? comp.quantityRequired} ${compCost.effectiveUsageUnit}`,
          `${formatCurrencyValue(compCost.effectivePurchasePrice, currency)} / ${compCost.effectivePurchaseUnit}`,
          formatCurrencyValue(compCost.costPerFinishedUnit, currency),
          `${compCost.totalQuantityRequired.toLocaleString()} ${compCost.effectiveUsageUnit}`,
          formatCurrencyValue(compCost.totalCost, currency),
        ];
      });

      if (packagingItems.length > 0) {
        packagingRows.push([
          'Subtotal Packaging',
          '',
          '',
          formatCurrencyValue(summary.packagingCostPerUnit, currency),
          '',
          formatCurrencyValue(summary.packagingTotal, currency),
        ]);
      }

      autoTable(doc, {
        startY: curY + 6,
        margin: { left: 40, right: 40 },
        head: [['Packaging Item', 'Usage / Product', 'Purchase Price', 'Cost / Product', 'Batch Qty Needed', 'Total Batch Cost']],
        body: packagingRows.length > 0 ? packagingRows : [['No packaging items added', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        didParseCell: (data) => {
          if (packagingItems.length > 0 && data.row.index === packagingRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [248, 250, 252];
          }
        },
      });

      // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
      curY = doc.lastAutoTable.finalY + 16;

      // 3. Labor & Overhead (if any)
      if (varLabor.length > 0 || varOverhead.length > 0) {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('C. Labor & Operational Overhead', 40, curY);

        const expRows: string[][] = [];
        varLabor.forEach((l) => {
          const lCost = calculateLaborStageCost(l, summary.actualFinishedQuantity);
          expRows.push([
            l.stageName,
            'Labor',
            l.costMethod.replace('_', ' '),
            formatCurrencyValue(lCost.costPerFinishedUnit, currency),
            formatCurrencyValue(lCost.totalCost, currency),
          ]);
        });
        varOverhead.forEach((o) => {
          const oCost = calculateOverheadItemCost(o, summary.actualFinishedQuantity, {
            materials: summary.rawMaterialsTotal + summary.packagingTotal,
            labor: summary.laborTotal,
            directCosts: summary.rawMaterialsTotal + summary.packagingTotal + summary.laborTotal,
          });
          expRows.push([
            o.name,
            'Overhead',
            o.allocationMethod.replace('_', ' '),
            formatCurrencyValue(oCost.costPerFinishedUnit, currency),
            formatCurrencyValue(oCost.totalCost, currency),
          ]);
        });

        autoTable(doc, {
          startY: curY + 6,
          margin: { left: 40, right: 40 },
          head: [['Expense Description', 'Category', 'Method', 'Cost / Product', 'Total Batch Cost']],
          body: expRows,
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontSize: 7 },
          bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        });

        // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
        curY = doc.lastAutoTable.finalY + 14;
      }

      // Final Product Cost Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(40, curY, pageWidth - 80, 52, 4, 4, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Materials: ${formatCurrencyValue(summary.rawMaterialsTotal, currency)} (${formatCurrencyValue(summary.rawMaterialsCostPerUnit, currency)}/unit)`, 55, curY + 18);
      doc.text(`Packaging: ${formatCurrencyValue(summary.packagingTotal, currency)} (${formatCurrencyValue(summary.packagingCostPerUnit, currency)}/unit)`, 55, curY + 32);
      doc.text(`Labor & Overhead: ${formatCurrencyValue(summary.laborTotal + summary.overheadTotal, currency)} (${formatCurrencyValue(summary.laborCostPerUnit + summary.overheadCostPerUnit, currency)}/unit)`, 55, curY + 46);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(3, 105, 161);
      doc.text(`HPP / Product: ${formatCurrencyValue(summary.unitHpp, currency)}`, pageWidth - 55, curY + 22, { align: 'right' });

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Product Budget: ${formatCurrencyValue(summary.totalProductionCost, currency)}`, pageWidth - 55, curY + 42, { align: 'right' });
    });
  }

  // ==========================================================================
  // 3. CONSOLIDATED ALL REPORT
  // ==========================================================================
  else {
    drawBrandHeader(
      doc,
      'COSTING DESK',
      'CONSOLIDATED COSTING & HPP OVERVIEW',
      `Date: ${dateStr}`,
      `Currency: ${currency}`
    );

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('All Products & Groups Overview', 40, 80);

    let totalUnits = 0;
    let totalCost = 0;

    const tableRows = allVariants.map((v) => {
      const prod = allProducts.find((p) => p.id === v.productId);
      const groupObj = prod?.groupId ? allGroups.find((g) => g.id === prod.groupId) : null;
      const varBom = bom.filter((b) => b.variantId === v.id);
      const varLabor = labor.filter((l) => l.variantId === v.id);
      const varOverhead = overhead.filter((o) => o.variantId === v.id);

      const summary = calculateProductCostSummary(v, varBom, varLabor, varOverhead, materials);

      totalUnits += summary.actualFinishedQuantity;
      totalCost += summary.totalProductionCost;

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
      startY: 96,
      margin: { left: 40, right: 40 },
      head: [['Product Name', 'Group', 'Variant', 'Units', `HPP / Unit (${currency})`, 'Total Cost']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    const finalY = doc.lastAutoTable.finalY + 18;
    const weightedHpp = totalUnits > 0 ? totalCost / totalUnits : 0;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(40, finalY, pageWidth - 80, 48, 4, 4, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Finished Units: ${totalUnits.toLocaleString()}`, 55, finalY + 18);
    doc.text(`Total Production Cost: ${formatCurrencyValue(totalCost, currency)}`, 55, finalY + 34);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text(
      `Weighted Average HPP: ${formatCurrencyValue(weightedHpp, currency)} / unit`,
      pageWidth - 55,
      finalY + 26,
      { align: 'right' }
    );
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Costing Desk — Page ${i} of ${pageCount} | Universal Product Costing & HPP Management`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 16,
      { align: 'center' }
    );
  }

  doc.save(`CostingDesk_Report_${Date.now()}.pdf`);
}
