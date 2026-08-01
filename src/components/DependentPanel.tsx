import React, { useState } from 'react';
import { AppData, DependentConfig, Order, OrderReport, Comanda, ComandaReportItem, OrderItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  Utensils, 
  FileText, 
  Clock, 
  UserCheck, 
  CheckCircle, 
  Send, 
  Download, 
  FileCheck, 
  Plus, 
  DollarSign, 
  Layers, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';
import jsPDF from 'jspdf';
import { HistoryViewer } from './HistoryViewer';

interface DependentPanelProps {
  key?: string;
  data: AppData;
  updateData: (data: Partial<AppData>) => void;
  dependentInfo: DependentConfig;
}

export function DependentPanel({ data, updateData, dependentInfo }: DependentPanelProps) {
  const { t } = useLanguage();
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [lastDownloadedPdf, setLastDownloadedPdf] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<OrderItem[]>([]);

  // Selected Table state for manual Presencial mode
  const [activeTableNumber, setActiveTableNumber] = useState<string>(dependentInfo.tableNumber || 'Mesa 1');

  // New Comanda creation state
  const [customerNameInput, setCustomerNameInput] = useState('');
  
  // Adding dish state
  const [selectedMenuItem, setSelectedMenuItem] = useState(data.menuItems[0]?.name || '');
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  // Close Comanda Modal state
  const [closingComanda, setClosingComanda] = useState<Comanda | null>(null);
  const [selectedCurrencies, setSelectedCurrencies] = useState<('CUP' | 'USD' | 'EUR')[]>(['CUP']);
  const [payCUP, setPayCUP] = useState<number>(0);
  const [payUSD, setPayUSD] = useState<number>(0);
  const [payEUR, setPayEUR] = useState<number>(0);
  const [lastEditedCurrency, setLastEditedCurrency] = useState<'CUP' | 'USD' | 'EUR'>('CUP');
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital' | 'mixed'>('cash');
  const [cashPart, setCashPart] = useState<number>(0);
  const [digitalPart, setDigitalPart] = useState<number>(0);

  // Ready orders modal state for dependent
  const [showReadyModal, setShowReadyModal] = useState<boolean>(false);

  const comandas = (data.comandas || []).filter(c => c.tableNumber === activeTableNumber);
  const openComanda = comandas.find(c => c.status === 'open');
  const closedComandas = comandas.filter(c => c.status === 'closed');

  // Exchange rate & ready kitchen orders
  const usdCUP = data.exchangeRate?.usdCUP || 320;
  const eurCUP = data.exchangeRate?.eurCUP || 350;
  const readyKitchenOrders = (data.orders || []).filter(o => o.status === 'kitchen_ready' || o.status === 'ready_to_serve');

  // Filter incoming client pending orders for table
  const clientPendingOrders = (data.orders || []).filter(o => (o.status === 'client_pending' || o.status === 'pending_dependent') && (o.tableNumber === activeTableNumber || o.tableNumber?.includes(activeTableNumber.replace(/\D/g, ''))));

  const isShiftActive = data.isShiftActive !== false;

  // --- Handlers ---

  // Download PDF mandatory helper when sending to kitchen
  const downloadOrderPdf = (
    tableNum: string,
    customerName: string,
    itemsList: OrderItem[],
    orderId: string
  ) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}-${mins}-${secs}`;
    const timeFormatted = `${hours}:${mins}:${secs}`;

    const waiterName = dependentInfo.name || `Dependiente_${tableNum}`;
    const cleanWaiterName = waiterName.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Format: Dependiente_[Nombre]_[AAAA-MM-DD]_[HH-MM-SS].pdf
    const pdfFileName = `Dependiente_${cleanWaiterName}_${dateStr}_${timeStr}.pdf`;

    const doc = new jsPDF();

    // Header Banner
    doc.setFillColor(27, 67, 50);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RESTAURANTE TERRAZA 53&M', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('COMANDA OFICIAL ENVIADA A COCINA', 14, 26);
    doc.text('Carpeta de Destino: /Dependiente/', 14, 32);

    // Metadata Card
    doc.setFillColor(245, 245, 240);
    doc.roundedRect(14, 44, 182, 38, 3, 3, 'F');

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dependiente (Mesero): ${waiterName}`, 20, 54);
    doc.text(`Ubicación / Mesa: ${tableNum}`, 20, 62);
    doc.text(`Cliente / Comensal: ${customerName}`, 20, 70);

    doc.text(`Fecha: ${dateStr}`, 120, 54);
    doc.text(`Hora Descarga: ${timeFormatted}`, 120, 62);
    doc.text(`ID Pedido: #${orderId}`, 120, 70);

    // Items
    let y = 92;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 67, 50);
    doc.text('DETALLE DE PLATOS Y RACIONES PARA COCINA:', 14, y);
    y += 8;

    doc.setFillColor(230, 230, 225);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text('CANTIDAD', 20, y + 5.5);
    doc.text('DESCRIPCIÓN DEL PLATO', 60, y + 5.5);
    doc.text('PRECIO UNITARIO', 150, y + 5.5);
    y += 12;

    let totalCUP = 0;
    itemsList.forEach(it => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const sub = (it.priceCUP || 0) * it.quantity;
      totalCUP += sub;

      doc.text(`${it.quantity}x`, 22, y);
      doc.text(`${it.name}`, 60, y);
      doc.text(`$${it.priceCUP || 0} CUP`, 150, y);
      y += 8;
    });

    y += 6;
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 67, 50);
    doc.text(`TOTAL PEDIDO: $${totalCUP} CUP`, 14, y);

    y += 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Organizado en la carpeta /Dependiente/ de su almacenamiento. Nombre: ${pdfFileName}`, 14, y);

    doc.save(pdfFileName);
    setLastDownloadedPdf(pdfFileName);
    return pdfFileName;
  };

  // Approve Client Order and Send to Kitchen
  const handleApproveClientOrder = (clientOrder: Order) => {
    if (!isShiftActive) {
      alert(t('⚠️ La jornada actual no está iniciada por el Administrador.'));
      return;
    }

    let currentOpen = openComanda;
    let allComandas = [...(data.comandas || [])];

    if (!currentOpen) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const shortId = Date.now().toString().slice(-4);
      const generatedId = `${month}${day}-${dependentInfo.id}-${shortId}`;

      currentOpen = {
        id: generatedId,
        tableNumber: clientOrder.tableNumber,
        dependentId: dependentInfo.id,
        dependentName: dependentInfo.name || `Dependiente ${clientOrder.tableNumber}`,
        customerName: clientOrder.customerName || t('Cliente Comensal'),
        status: 'open',
        openedAt: Date.now(),
        orders: []
      };
      allComandas = [currentOpen, ...allComandas];
    } else {
      // If there's already an open comanda and it has default or empty name, update to actual client name
      if ((currentOpen.customerName === t('Cliente Comensal') || !currentOpen.customerName) && clientOrder.customerName) {
        currentOpen.customerName = clientOrder.customerName;
        allComandas = allComandas.map(c => c.id === currentOpen?.id ? { ...c, customerName: clientOrder.customerName } : c);
      }
    }

    const itemsList: OrderItem[] = clientOrder.orderItems && clientOrder.orderItems.length > 0
      ? clientOrder.orderItems
      : clientOrder.items.map(raw => {
          const match = raw.match(/^(\d+)x\s+(.+)$/);
          const qty = match ? parseInt(match[1]) : 1;
          const name = match ? match[2] : raw;
          const found = data.menuItems.find(m => m.name === name);
          return { name, quantity: qty, priceCUP: found ? found.priceCUP : 100 };
        });

    const updatedOrder: Order = {
      ...clientOrder,
      comandaId: currentOpen.id,
      status: 'pending', // Now sent to kitchen!
      orderItems: itemsList,
      customerName: clientOrder.customerName || currentOpen.customerName,
      assignedDependentId: dependentInfo.id
    };

    allComandas = allComandas.map(c => {
      if (c.id === currentOpen?.id) {
        const orderExists = c.orders.some(o => o.id === clientOrder.id || (o as any)._id === clientOrder.id);
        const newOrders = orderExists
          ? c.orders.map(o => (o.id === clientOrder.id || (o as any)._id === clientOrder.id) ? updatedOrder : o)
          : [...c.orders, updatedOrder];
        return { ...c, orders: newOrders };
      }
      return c;
    });

    const exists = (data.orders || []).some(o => o.id === clientOrder.id || (o as any)._id === clientOrder.id);
    const updatedOrders = exists
      ? (data.orders || []).map(o => (o.id === clientOrder.id || (o as any)._id === clientOrder.id) ? updatedOrder : o)
      : [...(data.orders || []), updatedOrder];

    // Download PDF
    const pdfName = downloadOrderPdf(
      clientOrder.tableNumber,
      currentOpen.customerName || clientOrder.customerName || 'Cliente Comensal',
      itemsList,
      updatedOrder.id
    );

    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Dependiente' as const,
      userOrDevice: dependentInfo.username,
      action: 'Aprobación & Envío a Cocina (PDF)',
      details: `Aprobó pedido de cliente en ${clientOrder.tableNumber} (${clientOrder.customerName || 'Cliente'}), lo mandó a cocina y descargó ${pdfName}`
    };

    updateData({
      comandas: allComandas,
      orders: updatedOrders,
      auditLogs: [log, ...(data.auditLogs || [])]
    });
  };

  // 1. Open new Comanda
  const handleOpenComanda = () => {
    if (!isShiftActive) {
      alert(t('⚠️ La jornada actual no ha sido iniciada por el Administrador. Solicite al Administrador que inicie la jornada para abrir comandas.'));
      return;
    }

    if (openComanda) {
      alert(t('Ya existe una comanda abierta en esta mesa. Debes cerrarla antes de abrir una nueva.'));
      return;
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const shortId = Date.now().toString().slice(-4);
    const generatedId = `${month}${day}-${dependentInfo.id}-${shortId}`;

    const newComanda: Comanda = {
      id: generatedId,
      tableNumber: activeTableNumber,
      dependentId: dependentInfo.id,
      dependentName: dependentInfo.name || `Dependiente ${activeTableNumber}`,
      customerName: customerNameInput.trim() || t('Cliente Comensal'),
      status: 'open',
      openedAt: Date.now(),
      orders: []
    };

    updateData({ comandas: [newComanda, ...(data.comandas || [])] });
    setCustomerNameInput('');

    // Audit log
    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Dependiente' as const,
      userOrDevice: dependentInfo.username,
      action: 'Apertura de Comanda',
      details: `Abrió nueva comanda #${newComanda.id} para ${activeTableNumber} (${newComanda.customerName})`
    };
    updateData({ auditLogs: [log, ...(data.auditLogs || [])] });
  };

  // 2. Add dish to active Comanda (local draft)
  const handleAddItemToComanda = () => {
    if (!isShiftActive) {
      alert(t('⚠️ La jornada actual no está iniciada por el Administrador.'));
      return;
    }

    if (!openComanda) {
      alert(t('Debes abrir una comanda primero.'));
      return;
    }

    const menuObj = data.menuItems.find(m => m.name === selectedMenuItem) || data.menuItems[0];
    if (!menuObj) return;

    const newOrderItem: OrderItem = {
      name: menuObj.name,
      quantity: itemQuantity,
      priceCUP: menuObj.priceCUP
    };

    setDraftItems([...draftItems, newOrderItem]);
    setItemQuantity(1);
  };

  // 2b. Send Drafts to Kitchen
  const handleSendDraftsToKitchen = () => {
    if (!isShiftActive || !openComanda || draftItems.length === 0) return;

    const orderSequence = openComanda.orders.length + 1;
    const newOrder: Order = {
      id: `${openComanda.id}-P${orderSequence}`,
      comandaId: openComanda.id,
      tableNumber: activeTableNumber,
      items: draftItems.map(i => `${i.quantity}x ${i.name}`),
      orderItems: draftItems,
      status: 'pending',
      timestamp: Date.now()
    };

    // Download PDF mandatory on send to kitchen
    const pdfName = downloadOrderPdf(
      activeTableNumber,
      openComanda.customerName || 'Cliente Comensal',
      draftItems,
      newOrder.id
    );

    // Update Comanda and global Orders
    const updatedComandas = (data.comandas || []).map(c => {
      if (c.id === openComanda.id) {
        return {
          ...c,
          orders: [...c.orders, newOrder]
        };
      }
      return c;
    });

    updateData({
      comandas: updatedComandas,
      orders: [...(data.orders || []), newOrder]
    });

    setDraftItems([]); // Clear drafts

    // Audit log
    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Dependiente' as const,
      userOrDevice: dependentInfo.username,
      action: 'Pedido a Cocina & Descarga PDF',
      details: `Envió ${draftItems.length} platos a comanda #${openComanda.id} (${activeTableNumber}), mandó a cocina y descargó ${pdfName}`
    };
    updateData({ auditLogs: [log, ...(data.auditLogs || [])] });
  };

  // Calculate total for open comanda
  const calculateComandaTotal = (com: Comanda) => {
    let total = 0;
    com.orders.forEach(o => {
      if (o.orderItems) {
        o.orderItems.forEach(it => {
          total += (it.priceCUP || 0) * it.quantity;
        });
      } else {
        // Fallback string matching
        o.items.forEach(raw => {
          const match = raw.match(/^(\d+)x\s+(.+)$/);
          const qty = match ? parseInt(match[1]) : 1;
          const name = match ? match[2] : raw;
          const found = data.menuItems.find(m => m.name === name);
          total += (found ? found.priceCUP : 100) * qty;
        });
      }
    });
    return total;
  };

  // Open close comanda modal
  const handleOpenCloseModal = (com: Comanda) => {
    setClosingComanda(com);
    const total = calculateComandaTotal(com);
    setSelectedCurrencies(['CUP']);
    setPayCUP(total);
    setPayUSD(0);
    setPayEUR(0);
    setPaymentMethod('cash');
    setCashPart(total);
    setDigitalPart(0);
  };

  // Toggle selected currencies
  const toggleCurrency = (cur: 'CUP' | 'USD' | 'EUR') => {
    if (!closingComanda) return;
    const totalCUP = calculateComandaTotal(closingComanda);

    let updated: ('CUP' | 'USD' | 'EUR')[];
    if (selectedCurrencies.includes(cur)) {
      if (selectedCurrencies.length === 1) return; // Keep at least one currency
      updated = selectedCurrencies.filter(c => c !== cur);
    } else {
      updated = [...selectedCurrencies, cur];
    }
    setSelectedCurrencies(updated);

    if (updated.length === 1) {
      const sole = updated[0];
      setPayCUP(sole === 'CUP' ? totalCUP : 0);
      setPayUSD(sole === 'USD' ? Number((totalCUP / usdCUP).toFixed(2)) : 0);
      setPayEUR(sole === 'EUR' ? Number((totalCUP / eurCUP).toFixed(2)) : 0);
    } else {
      let currentCUP = updated.includes('CUP') ? Math.min(payCUP, totalCUP) : 0;
      let remainingCUP = Math.max(0, totalCUP - currentCUP);

      let newUSD = 0;
      let newEUR = 0;

      if (updated.includes('USD') && updated.includes('EUR')) {
        newUSD = Number(((remainingCUP / 2) / usdCUP).toFixed(2));
        newEUR = Number(((remainingCUP / 2) / eurCUP).toFixed(2));
      } else if (updated.includes('USD')) {
        newUSD = Number((remainingCUP / usdCUP).toFixed(2));
      } else if (updated.includes('EUR')) {
        newEUR = Number((remainingCUP / eurCUP).toFixed(2));
      }

      setPayCUP(currentCUP);
      setPayUSD(newUSD);
      setPayEUR(newEUR);
    }
  };

  // Auto calculate when changing one currency input
  const handleCurrencyInputChange = (changedCur: 'CUP' | 'USD' | 'EUR', rawVal: number) => {
    if (!closingComanda) return;
    const totalCUP = calculateComandaTotal(closingComanda);
    const val = Math.max(0, rawVal);

    if (changedCur === 'CUP') {
      setPayCUP(val);
      const remainingCUP = Math.max(0, totalCUP - val);
      if (selectedCurrencies.includes('USD') && selectedCurrencies.includes('EUR')) {
        setPayUSD(Number(((remainingCUP / 2) / usdCUP).toFixed(2)));
        setPayEUR(Number(((remainingCUP / 2) / eurCUP).toFixed(2)));
      } else if (selectedCurrencies.includes('USD')) {
        setPayUSD(Number((remainingCUP / usdCUP).toFixed(2)));
      } else if (selectedCurrencies.includes('EUR')) {
        setPayEUR(Number((remainingCUP / eurCUP).toFixed(2)));
      }
    } else if (changedCur === 'USD') {
      setPayUSD(val);
      const usdInCUP = val * usdCUP;
      if (selectedCurrencies.includes('CUP') && selectedCurrencies.includes('EUR')) {
        const rem = Math.max(0, totalCUP - usdInCUP - payCUP);
        setPayEUR(Number((rem / eurCUP).toFixed(2)));
      } else if (selectedCurrencies.includes('CUP')) {
        setPayCUP(Math.max(0, Math.round(totalCUP - usdInCUP)));
      } else if (selectedCurrencies.includes('EUR')) {
        const rem = Math.max(0, totalCUP - usdInCUP);
        setPayEUR(Number((rem / eurCUP).toFixed(2)));
      }
    } else if (changedCur === 'EUR') {
      setPayEUR(val);
      const eurInCUP = val * eurCUP;
      if (selectedCurrencies.includes('CUP') && selectedCurrencies.includes('USD')) {
        const rem = Math.max(0, totalCUP - eurInCUP - payCUP);
        setPayUSD(Number((rem / usdCUP).toFixed(2)));
      } else if (selectedCurrencies.includes('CUP')) {
        setPayCUP(Math.max(0, Math.round(totalCUP - eurInCUP)));
      } else if (selectedCurrencies.includes('USD')) {
        const rem = Math.max(0, totalCUP - eurInCUP);
        setPayUSD(Number((rem / usdCUP).toFixed(2)));
      }
    }
  };

  // Generate PDF receipt for a closed comanda
  const generateComandaPDF = (com: Comanda) => {
    try {
      const doc = new jsPDF();
      const totalCUP = com.totalAmountCUP || calculateComandaTotal(com);
      const exRates = com.exchangeRateUsed || { usdCUP, eurCUP };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('53&M RESTAURANT', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('COMPROBANTE DE COBRO Y CIERRE DE COMANDA', 105, 28, { align: 'center' });
      doc.text('----------------------------------------------------', 105, 34, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Comanda ID: #${com.id}`, 20, 45);
      doc.text(`Mesa: ${com.tableNumber}`, 20, 52);
      doc.text(`Cliente: ${com.customerName || 'Cliente Comensal'}`, 20, 59);
      doc.text(`Dependiente: ${dependentInfo.name || dependentInfo.username}`, 20, 66);
      doc.text(`Fecha y Hora: ${new Date(com.closedAt || Date.now()).toLocaleDateString('es-ES')} ${new Date(com.closedAt || Date.now()).toLocaleTimeString('es-ES')}`, 20, 73);

      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS:', 20, 85);
      doc.setFont('helvetica', 'normal');

      let y = 93;
      if (com.orders) {
        com.orders.forEach(ord => {
          if (ord.orderItems) {
            ord.orderItems.forEach(it => {
              doc.text(`${it.quantity}x ${it.name}`, 25, y);
              doc.text(`$${(it.quantity * it.priceCUP).toLocaleString()} CUP`, 180, y, { align: 'right' });
              y += 7;
            });
          }
        });
      }

      doc.text('----------------------------------------------------', 105, y + 2, { align: 'center' });
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL DE MENÚ (BASE CUP):', 20, y);
      doc.text(`$${totalCUP.toLocaleString()} CUP`, 180, y, { align: 'right' });

      y += 8;
      doc.text('MONEDA(S) Y MONTO COBRADO:', 20, y);
      doc.text(`${com.paymentSummaryStr || `$${totalCUP} CUP`}`, 180, y, { align: 'right' });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('TASA DE CAMBIO APLICADA:', 20, y);
      doc.text(`1 USD = ${exRates.usdCUP} CUP | 1 EUR = ${exRates.eurCUP} CUP`, 180, y, { align: 'right' });

      y += 8;
      doc.text(`MÉTODO DE PAGO: ${(com.paymentMethod || 'cash').toUpperCase()}`, 20, y);

      y += 18;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('¡Gracias por su visita a 53&M Restaurant!', 105, y, { align: 'center' });

      doc.save(`Recibo_Comanda_${com.id}_Mesa_${com.tableNumber}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF de la comanda:', err);
    }
  };

  // 3. Confirm Close Comanda & Payment
  const handleConfirmCloseComanda = () => {
    if (!closingComanda) return;

    const totalCUP = calculateComandaTotal(closingComanda);
    let finalCash = paymentMethod === 'cash' ? totalCUP : paymentMethod === 'mixed' ? cashPart : 0;
    let finalDigital = paymentMethod === 'digital' ? totalCUP : paymentMethod === 'mixed' ? digitalPart : 0;

    const parts: string[] = [];
    if (selectedCurrencies.includes('CUP') && payCUP > 0) parts.push(`$${payCUP.toLocaleString()} CUP`);
    if (selectedCurrencies.includes('USD') && payUSD > 0) parts.push(`$${payUSD} USD`);
    if (selectedCurrencies.includes('EUR') && payEUR > 0) parts.push(`€${payEUR} EUR`);
    
    const summaryStr = parts.length > 0 ? parts.join(' + ') : `$${totalCUP.toLocaleString()} CUP`;

    const closedComandaObj: Comanda = {
      ...closingComanda,
      status: 'closed' as const,
      closedAt: Date.now(),
      currency: selectedCurrencies[0],
      currencyBreakdown: {
        CUP: selectedCurrencies.includes('CUP') ? payCUP : undefined,
        USD: selectedCurrencies.includes('USD') ? payUSD : undefined,
        EUR: selectedCurrencies.includes('EUR') ? payEUR : undefined,
      },
      paymentSummaryStr: summaryStr,
      paymentMethod,
      cashAmount: finalCash,
      digitalAmount: finalDigital,
      totalAmountCUP: totalCUP,
      exchangeRateUsed: { usdCUP, eurCUP }
    };

    const updatedComandas = (data.comandas || []).map(c => {
      if (c.id === closingComanda.id) {
        return closedComandaObj;
      }
      return c;
    });

    const closingOrderIds = (closingComanda.orders || []).map(o => o.id);
    const updatedOrders = (data.orders || []).map(o => {
      if (o.comandaId === closingComanda.id || closingOrderIds.includes(o.id)) {
        return { ...o, status: 'closed' as const };
      }
      return o;
    });

    // Audit log
    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Dependiente' as const,
      userOrDevice: dependentInfo.username,
      action: 'Cierre y Cobro de Comanda Multi-Moneda',
      details: `Cerró comanda #${closingComanda.id} de ${dependentInfo.tableNumber}. Total Cobrado: ${summaryStr} (${paymentMethod})`
    };

    updateData({
      comandas: updatedComandas,
      orders: updatedOrders,
      auditLogs: [log, ...(data.auditLogs || [])]
    });

    // Generate PDF receipt automatically on close
    generateComandaPDF(closedComandaObj);

    setClosingComanda(null);
    alert(t('Comanda cerrada y cobrada con éxito. Se ha descargado el comprobante en PDF y liberado la mesa.'));
  };

  // 4. Generate Shift Report to Gerente
  const handleGenerateShiftReport = () => {
    // Aggregate all closed comandas served by this dependent across all tables, or on the active table
    const comandasToReport = (data.comandas || []).filter(c => 
      c.status === 'closed' && 
      (
        c.dependentId === dependentInfo.id || 
        c.dependentName === dependentInfo.name || 
        c.tableNumber === activeTableNumber ||
        dependentInfo.id === 'DEP-SIM' ||
        !c.dependentId
      )
    );

    if (comandasToReport.length === 0) {
      alert(`❌ No se pudo generar el informe de dependiente.\n\nMotivo: No hay comandas cerradas registradas en el sistema para este dependiente/mesa en este momento.\n\nPor favor, asegúrese de haber cerrado y cobrado al menos una comanda (usando la opción "Cerrar & Cobrar Comanda") antes de intentar reportar al Gerente.`);
      return;
    }

    // Check for duplicate reports
    const currentComandaIds = comandasToReport.map(c => c.id).sort().join(',');
    const duplicateReport = (data.orderReports || []).find(rep => {
      const repComandaIds = (rep.comandas || []).map(rc => rc.comandaId).sort().join(',');
      return repComandaIds === currentComandaIds;
    });

    if (duplicateReport) {
      alert(`⚠️ El informe de turno no se generó porque está DUPLICADO.\n\nYa existe un informe idéntico enviado a la Gerencia (Reporte ID: ${duplicateReport.id}) con las mismas ${comandasToReport.length} comanda(s) cerradas por un monto total de $${duplicateReport.totalAmountCUP.toLocaleString()} CUP.\n\nNo hay nuevas comandas cerradas que no hayan sido reportadas.`);
      return;
    }

    const now = new Date();
    if (now.getHours() < 23) {
      if (!confirm(t('La jornada aún no ha concluido (antes de las 23:00). Lo ideal es generar este informe al final del día. ¿Deseas generarlo de todos modos?'))) {
        return;
      }
    }

    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    // Build Comanda Report Items
    let grandTotalCUP = 0;
    let grandTotalUSD = 0;
    let grandTotalEUR = 0;

    let totalCashCUP = 0, totalDigitalCUP = 0;
    let totalCashUSD = 0, totalDigitalUSD = 0;
    let totalCashEUR = 0, totalDigitalEUR = 0;

    const comandaReportItems: ComandaReportItem[] = comandasToReport.map(com => {
      const comTotal = com.totalAmountCUP || calculateComandaTotal(com);
      const pm = com.paymentMethod || 'cash';

      let paidCUP = 0;
      let paidUSD = 0;
      let paidEUR = 0;

      if (com.currencyBreakdown) {
        paidCUP = com.currencyBreakdown.CUP || 0;
        paidUSD = com.currencyBreakdown.USD || 0;
        paidEUR = com.currencyBreakdown.EUR || 0;
      } else {
        const cur = com.currency || 'CUP';
        const ex = com.exchangeRateUsed || { usdCUP, eurCUP };
        if (cur === 'CUP') {
          paidCUP = comTotal;
        } else if (cur === 'USD') {
          paidUSD = Number((comTotal / ex.usdCUP).toFixed(2));
        } else if (cur === 'EUR') {
          paidEUR = Number((comTotal / ex.eurCUP).toFixed(2));
        }
      }

      let cashRatio = 1;
      let digitalRatio = 0;

      if (pm === 'cash') {
        cashRatio = 1;
        digitalRatio = 0;
      } else if (pm === 'digital') {
        cashRatio = 0;
        digitalRatio = 1;
      } else if (pm === 'mixed') {
        const cPart = com.cashAmount || 0;
        const dPart = com.digitalAmount || 0;
        const sumParts = cPart + dPart;
        if (sumParts > 0) {
          cashRatio = cPart / sumParts;
          digitalRatio = dPart / sumParts;
        } else {
          cashRatio = 0.5;
          digitalRatio = 0.5;
        }
      }

      const cupCash = Number((paidCUP * cashRatio).toFixed(2));
      const cupDigital = Number((paidCUP * digitalRatio).toFixed(2));

      const usdCash = Number((paidUSD * cashRatio).toFixed(2));
      const usdDigital = Number((paidUSD * digitalRatio).toFixed(2));

      const eurCash = Number((paidEUR * cashRatio).toFixed(2));
      const eurDigital = Number((paidEUR * digitalRatio).toFixed(2));

      grandTotalCUP += paidCUP;
      grandTotalUSD += paidUSD;
      grandTotalEUR += paidEUR;

      totalCashCUP += cupCash;
      totalDigitalCUP += cupDigital;

      totalCashUSD += usdCash;
      totalDigitalUSD += usdDigital;

      totalCashEUR += eurCash;
      totalDigitalEUR += eurDigital;

      // Collect items
      const itemsList: { name: string; quantity: number; unitPrice: number; total: number }[] = [];
      com.orders.forEach(o => {
        if (o.orderItems) {
          o.orderItems.forEach(it => {
            itemsList.push({
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.priceCUP,
              total: it.quantity * it.priceCUP
            });
          });
        }
      });

      return {
        comandaId: com.id,
        tableNumber: com.tableNumber,
        openedAt: com.openedAt,
        closedAt: com.closedAt,
        currency: com.currency || 'CUP',
        paymentMethod: pm,
        cashAmount: com.cashAmount || 0,
        digitalAmount: com.digitalAmount || 0,
        totalAmount: comTotal,
        currencyBreakdown: com.currencyBreakdown,
        paymentSummaryStr: com.paymentSummaryStr || `$${comTotal.toLocaleString()} CUP`,
        items: itemsList
      };
    });

    // Dishes Summary
    const itemSummaryMap: { [name: string]: { count: number; sales: number } } = {};
    let totalItemsCount = 0;

    comandaReportItems.forEach(cRep => {
      cRep.items.forEach(it => {
        if (!itemSummaryMap[it.name]) {
          itemSummaryMap[it.name] = { count: 0, sales: 0 };
        }
        itemSummaryMap[it.name].count += it.quantity;
        itemSummaryMap[it.name].sales += it.total;
        totalItemsCount += it.quantity;
      });
    });

    const itemsSummary = Object.keys(itemSummaryMap).map(k => ({
      name: k,
      count: itemSummaryMap[k].count,
      totalSalesCUP: itemSummaryMap[k].sales
    }));

    // Collect all orders belonging to the reported comandas
    const reportOrders: Order[] = [];
    comandasToReport.forEach(com => {
      if (com.orders) {
        reportOrders.push(...com.orders);
      }
    });
    const finalOrders = reportOrders.length > 0 
      ? reportOrders 
      : (data.orders || []).filter(o => o.tableNumber === activeTableNumber || o.tableNumber === dependentInfo.tableNumber);

    const newReport: OrderReport = {
      id: `REP-${Date.now()}`,
      dependentName: dependentInfo.name || `Dependiente ${dependentInfo.tableNumber}`,
      dependentUsername: dependentInfo.username,
      tableNumber: dependentInfo.tableNumber,
      timestamp: Date.now(),
      dateStr: todayStr,
      totalOrdersCount: comandasToReport.length,
      totalItemsCount,
      totalAmountCUP: grandTotalCUP,
      totalAmountUSD: grandTotalUSD,
      totalAmountEUR: grandTotalEUR,
      paymentSummary: {
        totalCashCUP,
        totalDigitalCUP,
        totalCashUSD,
        totalDigitalUSD,
        totalCashEUR,
        totalDigitalEUR
      },
      comandas: comandaReportItems,
      itemsSummary,
      orders: finalOrders
    };

    updateData({ orderReports: [newReport, ...(data.orderReports || [])] });

    // Generate PDF
    try {
      const doc = new jsPDF();
      doc.setFillColor(27, 67, 50);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('RESTAURANTE TERRAZA 53&M', 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Informe Detallado de Comandas y Recaudación', 14, 26);

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Dependiente: ${newReport.dependentName} (@${newReport.dependentUsername})`, 14, 45);
      doc.text(`Mesa: ${newReport.tableNumber}`, 14, 52);
      doc.text(`Fecha: ${todayStr}`, 14, 59);

      doc.setFillColor(245, 245, 240);
      doc.roundedRect(14, 66, 182, 30, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(27, 67, 50);
      doc.text(`Total Comandas Cerradas: ${comandasToReport.length}`, 20, 76);
      doc.text(`Total Raciones Servidas: ${totalItemsCount}`, 110, 76);
      doc.text(`Cobrado en CUP: $${grandTotalCUP} (Efectivo: $${totalCashCUP} | Digital: $${totalDigitalCUP})`, 20, 84);
      doc.text(`Cobrado en USD: $${grandTotalUSD} | EUR: €${grandTotalEUR}`, 20, 91);

      let yPos = 105;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Desglose de Comandas por Cobro:', 14, yPos);
      yPos += 8;

      comandaReportItems.forEach((cItem, i) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(235, 235, 230);
        doc.rect(14, yPos, 182, 7, 'F');
        doc.text(`Comanda #${cItem.comandaId} | Cobrado: ${cItem.paymentSummaryStr || `$${cItem.totalAmount} CUP`} | Método: ${cItem.paymentMethod.toUpperCase()}`, 18, yPos + 5);
        yPos += 11;

        cItem.items.forEach(it => {
          doc.setFont('helvetica', 'normal');
          doc.text(` • ${it.name} x${it.quantity} — $${it.total} CUP`, 22, yPos);
          yPos += 6;
        });
        yPos += 4;
      });

      doc.save(`Informe_Mesa_${dependentInfo.tableNumber.replace(/\s+/g, '')}_${Date.now()}.pdf`);
      
      alert(`✅ ¡Informe de Dependiente generado con éxito!\n\nSe ha enviado al Gerente de Restaurante de forma inmediata.\n\nResumen del informe:\n• Comandas reportadas: ${comandasToReport.length}\n• Raciones entregadas: ${totalItemsCount}\n• Recaudación total: $${grandTotalCUP.toLocaleString()} CUP\n• USD Recaudado: $${grandTotalUSD.toLocaleString()} USD\n• EUR Recaudado: €${grandTotalEUR.toLocaleString()} EUR\n\nEl documento PDF detallado ha sido descargado automáticamente.`);
    } catch (e) {
      console.error(e);
      alert(`❌ Error al generar el archivo PDF del informe. Sin embargo, los datos fueron sincronizados con Gerencia.`);
    }

    // Removed WhatsApp Logic
    setReportGenerated(true);
    setTimeout(() => setReportGenerated(false), 5000);
  };

  return (
    <div className="pt-28 pb-20 px-4 max-w-6xl mx-auto min-h-screen bg-stone-50">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="text-dark-green" size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">{t('Panel de Dependiente')}</span>
          </div>
          <h2 className="text-3xl font-serif text-dark-green">
            {dependentInfo.name || `Dependiente ${dependentInfo.tableNumber}`}
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            {t('Mesa Asignada:')} <strong className="text-stone-800">{dependentInfo.tableNumber}</strong> • {t('Usuario:')} <span className="font-mono">{dependentInfo.username}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all border border-stone-800 h-fit"
          >
            <Database size={16} />
            {t('Historial de Jornadas')}
          </button>

          <div className="text-right bg-stone-50 border border-stone-200 px-4 py-2 rounded-2xl">
            <div className="text-[11px] font-mono text-stone-400 uppercase">{t('ID Dispositivo')}</div>
            <div className="font-mono font-bold text-stone-800 text-sm">{dependentInfo.deviceId}</div>
            <div className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1">
              <Clock size={10} /> {t('Sesión activa por 24h')}
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen Ready Notification Alert Banner */}
      {readyKitchenOrders.length > 0 && (
        <div className="bg-emerald-600 text-white rounded-3xl p-5 mb-8 shadow-xl border-2 border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl text-2xl animate-bounce">🔔</div>
            <div>
              <h4 className="font-serif font-bold text-lg text-white">
                ¡{readyKitchenOrders.length} Pedido(s) listo(s) en Cocina!
              </h4>
              <p className="text-xs text-emerald-100">
                Cocina marcó listo el pedido de: <strong>{readyKitchenOrders.map(o => o.tableNumber).join(', ')}</strong>. ¡Favor pasar a recogerlo a cocina!
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReadyModal(true)}
            className="bg-white text-emerald-950 hover:bg-emerald-100 font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition-all uppercase tracking-wider shrink-0"
          >
            Ver Pedidos Listos ({readyKitchenOrders.length})
          </button>
        </div>
      )}

      {/* Action Banner to Generate & Send Report to Gerente */}
      <div className="bg-gradient-to-r from-dark-green via-stone-900 to-stone-800 text-white rounded-3xl p-6 mb-8 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider mb-1">
            <FileCheck size={16} /> {t('Envío Directo al Gerente de Restaurante')}
          </div>
          <h3 className="text-2xl font-serif">{t('Informe Oficial de Comandas & Turno')}</h3>
          <p className="text-stone-300 text-sm mt-1 max-w-xl">
            {t('Genera un informe con desglose de comandas, raciones, dinero cobrado en efectivo/digital y monedas (CUP, USD, EUR) para el Gerente de Restaurante.')}
          </p>
        </div>
        <button
          onClick={handleGenerateShiftReport}
          className="bg-gold hover:bg-yellow-400 text-stone-900 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all transform hover:-translate-y-0.5 shadow-md flex items-center gap-2 whitespace-nowrap"
        >
          <Send size={18} /> {t('Generar e Informar al Gerente')}
        </button>
      </div>

      {reportGenerated && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-2xl p-4 mb-8 flex items-center gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <div>
            <strong>{t('¡Informe Enviado con Éxito!')}</strong>
            <p className="text-xs text-green-700">{t('Guardado en el Panel de Gerencia y PDF descargado automáticamente.')}</p>
          </div>
        </div>
      )}

      {/* PDF Downloaded Banner Notification */}
      {lastDownloadedPdf && (
        <div className="bg-emerald-900 text-white p-5 rounded-3xl mb-8 shadow-xl border border-emerald-700 flex justify-between items-center animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-800 rounded-2xl text-gold">
              <FileCheck size={28} />
            </div>
            <div>
              <strong className="text-gold text-base font-serif block">
                ✓ Pedido Enviado a Cocina Exitosamente
              </strong>
              <div className="text-xs text-stone-200 mt-1 flex flex-wrap items-center gap-2">
                <span>Comanda en PDF generada y descargada:</span>
                <code className="bg-black/50 px-2.5 py-1 rounded-lg text-amber-300 font-mono font-bold text-xs">
                  {lastDownloadedPdf}
                </code>
              </div>
              <p className="text-[11px] text-stone-300 mt-1">
                📁 Guardado automáticamente en la carpeta <strong className="text-white">Dependiente</strong> del almacenamiento de su dispositivo.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastDownloadedPdf(null)}
            className="text-stone-300 hover:text-white bg-emerald-800/60 hover:bg-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* Incoming Client Pending Orders for this Table */}
      {clientPendingOrders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-100 to-amber-50 border-2 border-amber-400 p-6 rounded-3xl mb-8 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="animate-pulse flex h-3 w-3 rounded-full bg-amber-600"></span>
              <h4 className="font-serif font-bold text-lg text-amber-950">
                📩 Pedidos Entrantes de Clientes ({clientPendingOrders.length}) — {activeTableNumber}
              </h4>
            </div>
            <span className="text-xs text-amber-800 font-bold bg-amber-200 px-3 py-1 rounded-full">
              Atención en Mesa
            </span>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            Los clientes han seleccionado sus platos desde su teléfono. Revisa el pedido y presiona <strong>"Aprobar & Mandar a Cocina"</strong> para enviarlo a Cocina y descargar la comanda en PDF.
          </p>

          <div className="space-y-3">
            {clientPendingOrders.map((ord) => (
              <div key={ord.id} className="bg-white p-4 rounded-2xl border border-amber-300 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                      Cliente: {ord.customerName || 'Cliente'}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      #{ord.id}
                    </span>
                  </div>
                  <div className="font-bold text-stone-900 text-sm">
                    {ord.orderItems && ord.orderItems.length > 0
                      ? ord.orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ')
                      : ord.items.join(', ')}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                    Hora: {new Date(ord.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <button
                  onClick={() => handleApproveClientOrder(ord)}
                  className="w-full sm:w-auto bg-dark-green hover:bg-stone-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <Send size={15} /> Aprobar & Mandar a Cocina (Descargar PDF)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comandas Section */}
      <div className="space-y-8">
        {/* Table Selector for Presencial Mode */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">{t('Atención en Mesa (Modo Presencial):')}</span>
            <select
              value={activeTableNumber}
              onChange={e => setActiveTableNumber(e.target.value)}
              className="bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs font-bold text-dark-green outline-none focus:ring-2 focus:ring-dark-green"
            >
              <option value="Mesa 1">Mesa 1</option>
              <option value="Mesa 2">Mesa 2</option>
              <option value="Mesa 3">Mesa 3</option>
              <option value="Mesa 4">Mesa 4</option>
              <option value="Mesa 5">Mesa 5</option>
              <option value="Barra 1">Barra 1</option>
              <option value="Terraza A">Terraza A</option>
            </select>
          </div>

          <div className="text-xs text-stone-500 font-medium">
            {openComanda ? (
              <span className="text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                ● Comanda Abierta #{openComanda.id} ({openComanda.customerName})
              </span>
            ) : (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                ✓ Mesa Lista para Abrir Comanda
              </span>
            )}
          </div>
        </div>
          {/* SECTION: Open Comanda / Create Comanda */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-2xl text-stone-900">
                  {t('Comanda Activa para')} {dependentInfo.tableNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('Cada grupo de clientes en la mesa abre una comanda independiente.')}
                </p>
              </div>

              {openComanda && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {openComanda.paymentRequested && (
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-sm">
                      ⚠️ {t('SOLICITÓ CUENTA')}
                    </span>
                  )}
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold font-mono">
                    ● {t('Comanda Abierta')} #{openComanda.id}
                  </span>
                </div>
              )}
            </div>

            {/* If NO Comanda is open */}
            {!openComanda && (
              <div className="bg-stone-50 p-6 rounded-2xl border border-dashed border-stone-300 text-center space-y-4">
                <Utensils className="mx-auto text-stone-400" size={36} />
                <div>
                  <h4 className="font-serif font-bold text-lg text-stone-800">{t('Mesa Disponible')}</h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    {t('Abre una comanda cuando los comensales lleguen a la mesa para registrar sus pedidos.')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder={t('Nombre del Cliente / Referencia (Opcional)')}
                    value={customerNameInput}
                    onChange={e => setCustomerNameInput(e.target.value)}
                    className="w-full text-xs border border-stone-300 rounded-xl p-3 bg-white outline-none focus:ring-1 focus:ring-dark-green"
                  />
                  <button
                    onClick={handleOpenComanda}
                    className="w-full sm:w-auto bg-dark-green hover:bg-stone-800 text-white font-bold px-5 py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                  >
                    <Plus size={16} /> {t('Abrir Nueva Comanda')}
                  </button>
                </div>
              </div>
            )}

            {/* If Comanda IS OPEN */}
            {openComanda && (
              <div className="space-y-6">
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-amber-800 uppercase font-bold">{t('Comensal / Cliente:')}</span>
                    <h4 className="font-serif font-bold text-lg text-stone-900">{openComanda.customerName}</h4>
                    <span className="text-xs text-stone-500 font-mono">
                      {t('Abierta at:')} {new Date(openComanda.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-stone-400 font-bold">{t('Subtotal Comanda')}</span>
                      <div className="text-2xl font-serif font-bold text-dark-green">
                        ${calculateComandaTotal(openComanda)} CUP
                      </div>
                    </div>

                    {openComanda.orders.length > 0 && openComanda.orders.every(o => {
                      const liveOrder = (data.orders || []).find(lo => lo.id === o.id);
                      return (liveOrder ? liveOrder.status : o.status) === 'delivered';
                    }) && (
                      <button
                        onClick={() => handleOpenCloseModal(openComanda)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center gap-1.5 animate-fade-in"
                      >
                        <DollarSign size={16} /> {t('Cerrar & Cobrar Comanda')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Item Controls */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                  <h5 className="font-bold text-xs text-dark-green uppercase tracking-wider flex items-center gap-1">
                    <Plus size={14} /> {t('Agregar Pedido / Ración a esta Comanda')}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">{t('Seleccionar Plato del Menú')}</label>
                      <select
                        value={selectedMenuItem}
                        onChange={e => setSelectedMenuItem(e.target.value)}
                        className="w-full text-xs border border-stone-300 rounded-xl p-2.5 bg-white outline-none"
                      >
                        {data.menuItems.map(item => (
                          <option key={item.id} value={item.name}>
                            {item.name} (${item.priceCUP} CUP • ${(item.priceCUP / usdCUP).toFixed(2)} USD • €{(item.priceCUP / eurCUP).toFixed(2)} EUR)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">{t('Cantidad / Raciones')}</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={itemQuantity}
                        onChange={e => setItemQuantity(parseInt(e.target.value) || 1)}
                        className="w-full text-xs border border-stone-300 rounded-xl p-2.5 bg-white text-center font-bold outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        onClick={handleAddItemToComanda}
                        className="w-full bg-dark-green hover:bg-stone-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors shadow-sm"
                      >
                        + {t('Añadir')}
                      </button>
                    </div>
                  </div>

                  {/* Draft Items display */}
                  {draftItems.length > 0 && (
                    <div className="mt-4 bg-white border border-stone-200 rounded-xl p-3">
                      <h6 className="text-[11px] font-bold text-stone-500 uppercase mb-2 border-b border-stone-100 pb-1">Platos Listos para Enviar a Cocina (No Enviados):</h6>
                      <ul className="space-y-1">
                        {draftItems.map((draft, idx) => (
                          <li key={idx} className="flex justify-between items-center text-xs text-stone-700 bg-stone-50 px-2 py-1.5 rounded">
                            <span><strong className="text-stone-900">{draft.quantity}x</strong> {draft.name}</span>
                            <span className="text-stone-500 font-mono">${(draft.priceCUP || 0) * draft.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={handleSendDraftsToKitchen}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Send size={14} /> Mandar a Cocina ({draftItems.length} raciones)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Orders in this Comanda */}
                <div className="space-y-3">
                  <h5 className="font-bold text-xs text-stone-700 uppercase tracking-wider">
                    {t('Pedidos en esta Comanda')} ({openComanda.orders.length})
                  </h5>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {openComanda.orders.map(order => {
                      const liveOrder = (data.orders || []).find(o => o.id === order.id);
                      const currentStatus = liveOrder ? liveOrder.status : order.status;
                      return (
                        <div key={order.id} className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-stone-900">
                              {order.orderItems 
                                ? order.orderItems.map(i => `${i.name} (x${i.quantity})`).join(', ')
                                : order.items.join(', ')}
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono">
                              #{order.id} • {new Date(order.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                              currentStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              currentStatus === 'kitchen_ready' || currentStatus === 'ready_to_serve' ? 'bg-green-600 text-white animate-pulse shadow-xs' :
                              currentStatus === 'kitchen_in_progress' || currentStatus === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {currentStatus === 'delivered' ? '✓ Servido' :
                               currentStatus === 'kitchen_ready' || currentStatus === 'ready_to_serve' ? '🔔 ¡LISTO EN COCINA!' :
                               currentStatus === 'kitchen_in_progress' || currentStatus === 'in_progress' ? '🔥 En Elaboración' :
                               '⏳ Enviado a Cocina'}
                            </span>

                            {(currentStatus === 'kitchen_ready' || currentStatus === 'ready_to_serve') && (
                              <button
                                onClick={() => {
                                  const updatedOrders = (data.orders || []).map(o => o.id === order.id ? { ...o, status: 'delivered' as const } : o);
                                  const updatedComandas = (data.comandas || []).map(c => {
                                    if (c.id === openComanda.id) {
                                      return {
                                        ...c,
                                        orders: c.orders.map(o => o.id === order.id ? { ...o, status: 'delivered' as const } : o)
                                      };
                                    }
                                    return c;
                                  });
                                  updateData({ orders: updatedOrders, comandas: updatedComandas });
                                }}
                                className="bg-emerald-800 hover:bg-stone-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shadow-xs"
                              >
                                Marcar Servido
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {openComanda.orders.length === 0 && (
                      <div className="text-stone-400 text-xs text-center py-6 border border-dashed border-stone-200 rounded-xl">
                        {t('Esta comanda no tiene pedidos registrados aún.')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION: Closed Comandas History for this shift */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-4">
            <h4 className="font-serif text-xl text-stone-900">
              {t('Historial de Comandas Cerradas')} ({closedComandas.length})
            </h4>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {closedComandas.map(com => {
                const ex = com.exchangeRateUsed || { usdCUP, eurCUP };
                return (
                  <div key={com.id} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 text-xs space-y-2.5">
                    <div className="flex justify-between items-start font-bold">
                      <div>
                        <span className="text-dark-green text-sm">{com.customerName || 'Comensal'}</span>
                        <span className="text-[10px] text-stone-400 font-mono ml-2">Comanda #{com.id}</span>
                      </div>
                      <span className="bg-emerald-700 text-white font-mono font-bold px-3 py-1 rounded-full text-xs shadow-xs">
                        {com.paymentSummaryStr || `$${com.totalAmountCUP} CUP`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                      <div>
                        <span className="text-stone-400">Total Base:</span> <strong>${com.totalAmountCUP?.toLocaleString()} CUP</strong>
                      </div>
                      <div>
                        <span className="text-stone-400">Método de Pago:</span> <strong className="uppercase">{com.paymentMethod || 'cash'}</strong>
                      </div>
                      <div className="sm:col-span-2 text-[10px] font-mono text-emerald-800 bg-emerald-100/60 p-1.5 rounded-lg border border-emerald-200">
                        Tasa de cambio cobrada: 1 USD = {ex.usdCUP} CUP | 1 EUR = {ex.eurCUP} CUP
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-stone-400 pt-1">
                      <span>Cerrado a las {com.closedAt && new Date(com.closedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => generateComandaPDF(com)}
                        className="bg-stone-900 hover:bg-dark-green text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Download size={12} /> {t('Descargar Recibo PDF')}
                      </button>
                    </div>
                  </div>
                );
              })}

              {closedComandas.length === 0 && (
                <div className="text-stone-400 text-xs text-center py-6 border border-dashed border-stone-200 rounded-xl">
                  {t('No se han cerrado comandas en esta mesa durante el turno.')}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Modal: Close Comanda & Payment Collection */}
      {closingComanda && (() => {
        const comTotalCUP = calculateComandaTotal(closingComanda);
        const isSingleCurrency = selectedCurrencies.length === 1;

        let totalDisplayStr = `$${comTotalCUP.toLocaleString()} CUP`;
        if (isSingleCurrency) {
          if (selectedCurrencies[0] === 'USD') {
            totalDisplayStr = `$${(comTotalCUP / usdCUP).toFixed(2)} USD`;
          } else if (selectedCurrencies[0] === 'EUR') {
            totalDisplayStr = `€${(comTotalCUP / eurCUP).toFixed(2)} EUR`;
          } else {
            totalDisplayStr = `$${comTotalCUP.toLocaleString()} CUP`;
          }
        } else {
          const parts: string[] = [];
          if (selectedCurrencies.includes('CUP') && payCUP > 0) parts.push(`$${payCUP.toLocaleString()} CUP`);
          if (selectedCurrencies.includes('USD') && payUSD > 0) parts.push(`$${payUSD} USD`);
          if (selectedCurrencies.includes('EUR') && payEUR > 0) parts.push(`€${payEUR} EUR`);
          totalDisplayStr = parts.length > 0 ? parts.join(' + ') : `$${comTotalCUP.toLocaleString()} CUP`;
        }

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200 space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="p-3 bg-green-100 text-green-800 rounded-2xl">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900">
                    {t('Cerrar Comanda & Registrar Cobro')}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {t('Comanda')} #{closingComanda.id} — {closingComanda.customerName}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-400">{t('Importe Total de la Comanda')}</span>
                  <div className="text-3xl font-serif font-bold text-dark-green mt-0.5">
                    {totalDisplayStr}
                  </div>
                  {!isSingleCurrency && (
                    <span className="text-[11px] text-stone-500 block mt-1 font-mono">
                      (Total Base Menú: ${comTotalCUP.toLocaleString()} CUP)
                    </span>
                  )}
                </div>

                {/* Multi-Currency Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-stone-700">{t('Moneda(s) de Cobro:')}</label>
                    <span className="text-[10px] text-stone-400 font-mono">Selecciona 1, 2 o 3 monedas</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CUP', 'USD', 'EUR'] as const).map(c => {
                      const isSelected = selectedCurrencies.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCurrency(c)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-dark-green text-white border-dark-green shadow-sm'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{c === 'CUP' ? '🇨🇺 CUP' : c === 'USD' ? '🇺🇸 USD' : '🇪🇺 EUR'}</span>
                          {isSelected && <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Currency Amounts Inputs */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="text-xs font-bold text-emerald-950 flex justify-between items-center">
                    <span>Desglose de Cobro</span>
                    <span className="font-mono text-[10px] text-emerald-800">
                      Tasa: 1 USD={usdCUP} CUP | 1 EUR={eurCUP} CUP
                    </span>
                  </div>

                  {isSingleCurrency && (
                    <p className="text-[11px] text-emerald-800/80 bg-white/80 p-2 rounded-xl border border-emerald-200">
                      🔒 <strong>Monto oficial fijado por menú.</strong> No se permite alterar el precio en cobro de moneda única.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedCurrencies.includes('CUP') && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Monto CUP ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          readOnly={isSingleCurrency}
                          value={payCUP}
                          onChange={e => handleCurrencyInputChange('CUP', parseFloat(e.target.value) || 0)}
                          className={`w-full text-xs p-2.5 border rounded-xl font-mono font-bold outline-none ${
                            isSingleCurrency
                              ? 'bg-stone-100 text-stone-600 border-stone-300 cursor-not-allowed'
                              : 'bg-white text-dark-green border-stone-300 focus:border-dark-green'
                          }`}
                        />
                      </div>
                    )}

                    {selectedCurrencies.includes('USD') && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Monto USD ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          readOnly={isSingleCurrency}
                          value={payUSD}
                          onChange={e => handleCurrencyInputChange('USD', parseFloat(e.target.value) || 0)}
                          className={`w-full text-xs p-2.5 border rounded-xl font-mono font-bold outline-none ${
                            isSingleCurrency
                              ? 'bg-stone-100 text-stone-600 border-stone-300 cursor-not-allowed'
                              : 'bg-white text-dark-green border-stone-300 focus:border-dark-green'
                          }`}
                        />
                      </div>
                    )}

                    {selectedCurrencies.includes('EUR') && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Monto EUR (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          readOnly={isSingleCurrency}
                          value={payEUR}
                          onChange={e => handleCurrencyInputChange('EUR', parseFloat(e.target.value) || 0)}
                          className={`w-full text-xs p-2.5 border rounded-xl font-mono font-bold outline-none ${
                            isSingleCurrency
                              ? 'bg-stone-100 text-stone-600 border-stone-300 cursor-not-allowed'
                              : 'bg-white text-dark-green border-stone-300 focus:border-dark-green'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('Método de Pago:')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        paymentMethod === 'cash' ? 'bg-dark-green text-white border-dark-green' : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      💵 {t('Efectivo')}
                    </button>
                    <button
                      onClick={() => setPaymentMethod('digital')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        paymentMethod === 'digital' ? 'bg-dark-green text-white border-dark-green' : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      💳 {t('Digital')}
                    </button>
                    <button
                      onClick={() => setPaymentMethod('mixed')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        paymentMethod === 'mixed' ? 'bg-dark-green text-white border-dark-green' : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      🔀 {t('Mixto')}
                    </button>
                  </div>
                </div>

                {/* Mixed Breakdown */}
                {paymentMethod === 'mixed' && (
                  <div className="grid grid-cols-2 gap-3 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-1">{t('Monto en Efectivo')}</label>
                      <input
                        type="number"
                        value={cashPart}
                        onChange={e => setCashPart(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs p-2 border border-amber-300 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-1">{t('Monto Digital')}</label>
                      <input
                        type="number"
                        value={digitalPart}
                        onChange={e => setDigitalPart(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs p-2 border border-amber-300 rounded-lg bg-white font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setClosingComanda(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 font-bold text-xs"
                >
                  {t('Cancelar')}
                </button>
                <button
                  onClick={handleConfirmCloseComanda}
                  className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  ✓ {t('Confirmar Cobro & Liberar Mesa')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Ready Kitchen Orders List */}
      {showReadyModal && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowReadyModal(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl animate-bounce">
                🔔
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  Pedidos Listos en Cocina ({readyKitchenOrders.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Detalle completo de comandas preparadas en cocina listas para servir.
                </p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {readyKitchenOrders.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No hay pedidos pendientes por servir en cocina.
                </div>
              ) : (
                readyKitchenOrders.map(ord => {
                  const totalCUP = ord.orderItems?.reduce((acc, i) => acc + (i.priceCUP * i.quantity), 0) || 0;
                  return (
                    <div key={ord.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                        <div>
                          <span className="font-serif font-bold text-dark-green text-base">{ord.tableNumber}</span>
                          <span className="text-xs font-mono text-stone-500 ml-2">Pedido #{ord.id}</span>
                        </div>
                        <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase px-3 py-1 rounded-full animate-pulse">
                          🔔 LISTO EN COCINA
                        </span>
                      </div>

                      <div className="space-y-1 bg-white p-3 rounded-xl border border-stone-200 text-xs">
                        {ord.orderItems?.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-stone-800">
                            <span><strong className="text-dark-green">{it.quantity}x</strong> {it.name}</span>
                            <span className="font-mono text-stone-600">${(it.priceCUP * it.quantity).toLocaleString()} CUP</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-stone-100 flex justify-between font-bold text-xs text-stone-900">
                          <span>Total:</span>
                          <span className="font-mono text-dark-green">
                            ${totalCUP.toLocaleString()} CUP • ${(totalCUP / usdCUP).toFixed(2)} USD
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            const parentComanda = (data.comandas || []).find(c => c.orders.some(o => o.id === ord.id));
                            const targetComandaId = ord.comandaId || parentComanda?.id;
                            const updatedOrders = (data.orders || []).map(o => o.id === ord.id ? { ...o, status: 'delivered' as const, comandaId: targetComandaId } : o);
                            const updatedComandas = (data.comandas || []).map(c => {
                              if (c.id === targetComandaId) {
                                return {
                                  ...c,
                                  orders: c.orders.map(o => o.id === ord.id ? { ...o, status: 'delivered' as const, comandaId: targetComandaId } : o)
                                };
                              }
                              return c;
                            });
                            updateData({ orders: updatedOrders, comandas: updatedComandas });
                            if (readyKitchenOrders.length <= 1) setShowReadyModal(false);
                          }}
                          className="bg-emerald-700 hover:bg-stone-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                        >
                          ✓ Marcar Servido en Mesa
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-stone-100 pt-3 flex justify-end">
              <button
                onClick={() => setShowReadyModal(false)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-5 py-2.5 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL OVERLAY */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative p-6">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 font-bold text-lg p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-all z-10"
            >
              ✕
            </button>
            <HistoryViewer data={data} userRole="dependent" />
          </div>
        </div>
      )}
    </div>
  );
}
