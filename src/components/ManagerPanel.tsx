import React, { useState } from 'react';
import { AppData, OrderReport, KitchenReport, ManagerConfig, Reservation, CashRegisterClose } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShieldCheck, 
  FileText, 
  Utensils, 
  CalendarCheck, 
  Download, 
  Trash2, 
  Send, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  ChefHat, 
  Scale, 
  AlertTriangle, 
  FileSpreadsheet, 
  Lock,
  Power,
  RefreshCw, 
  Printer,
  Database
} from 'lucide-react';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { HistoryViewer } from './HistoryViewer';

interface ManagerPanelProps {
  data: AppData;
  updateData: (data: Partial<AppData>) => void;
  managerInfo?: ManagerConfig;
  updateStatus: (id: string, status: Reservation['status']) => void;
}

export function ManagerPanel({ data, updateData, managerInfo, updateStatus }: ManagerPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'reports' | 'comparative' | 'cierre_caja' | 'audit_log' | 'reservations' | 'history'>('reports');
  const [selectedReport, setSelectedReport] = useState<OrderReport | null>(null);

  // Cierre de caja wizard state
  const [cashCUP, setCashCUP] = useState<number>(0);
  const [digitalCUP, setDigitalCUP] = useState<number>(0);
  const [cashUSD, setCashUSD] = useState<number>(0);
  const [digitalUSD, setDigitalUSD] = useState<number>(0);
  const [cashEUR, setCashEUR] = useState<number>(0);
  const [digitalEUR, setDigitalEUR] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const reports = data.orderReports || [];
  const kitchenReports = data.kitchenReports || [];
  const orders = data.orders || [];
  const reservations = data.reservations || [];
  const auditLogs = data.auditLogs || [];
  const cashRegisterCloses = data.cashRegisterCloses || [];

  const isShiftActive = data.isShiftActive !== false;
  const [showResetModal, setShowResetModal] = useState(false);

  // Exchange rate check and states
  const isRateExpired = !data.exchangeRate || (Date.now() - data.exchangeRate.updatedAt > 24 * 60 * 60 * 1000);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [mgrUsdRate, setMgrUsdRate] = useState<number>(data.exchangeRate?.usdCUP || 320);
  const [mgrEurRate, setMgrEurRate] = useState<number>(data.exchangeRate?.eurCUP || 350);

  // Find the latest report for each dependent to avoid double-counting
  const latestReports = reports.reduce((acc, current) => {
    const existing = acc.find(r => r.dependentUsername === current.dependentUsername);
    if (!existing) {
      acc.push(current);
    } else if (current.timestamp > existing.timestamp) {
      const index = acc.indexOf(existing);
      acc[index] = current;
    }
    return acc;
  }, [] as OrderReport[]);

  // Calculate system expected totals from LATEST Dependent reports
  const totalExpectedCUP = latestReports.reduce((acc, r) => acc + (r.totalAmountCUP || 0), 0);
  const totalExpectedUSD = latestReports.reduce((acc, r) => acc + (r.totalAmountUSD || 0), 0);
  const totalExpectedEUR = latestReports.reduce((acc, r) => acc + (r.totalAmountEUR || 0), 0);

  // Shift Controls
  const checkDownloads = () => {
    const state = data.downloadsState || { adminAuditLog: false, managerZip: false };
    if (!state.managerZip && latestReports.length > 0) {
      return confirm('⚠️ Advertencia: Aún no has descargado el ZIP con los informes del día. ¿Deseas continuar con la acción de todos modos?');
    }
    return true;
  };

  const handleToggleShift = () => {
    const nextStatus = data.isShiftActive === false ? true : false;
    
    // Si se va a iniciar la jornada, verificar que la tasa de cambio esté configurada y vigente (<24h)
    if (nextStatus && isRateExpired) {
      alert('⚠️ ATENCIÓN GERENCIA: No se puede iniciar la jornada operacional si la Tasa de Cambio (CUP / USD / EUR) no está configurada o tiene más de 24 horas de antigüedad. Proceda a configurarla ahora.');
      setMgrUsdRate(data.exchangeRate?.usdCUP || 320);
      setMgrEurRate(data.exchangeRate?.eurCUP || 350);
      setShowExchangeModal(true);
      return;
    }

    // Si se va a cerrar la jornada, verificar descargas
    if (!nextStatus && !checkDownloads()) {
      return;
    }

    updateData({ isShiftActive: nextStatus });

    const actionText = nextStatus ? 'Inicio de Jornada' : 'Finalización de Jornada';
    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Gerente' as const,
      userOrDevice: managerInfo?.username || 'gerente',
      action: actionText,
      details: nextStatus ? 'El Gerente inició oficialmente la jornada de operaciones.' : 'El Gerente cerró la jornada de operaciones.'
    };
    updateData({ auditLogs: [log, ...(data.auditLogs || [])] });
    alert(`¡${actionText} realizado con éxito!`);
  };

  const handleSaveManagerExchangeRate = (e: React.FormEvent) => {
    e.preventDefault();
    const usd = Number(mgrUsdRate);
    const eur = Number(mgrEurRate);

    if (isNaN(usd) || usd <= 0 || isNaN(eur) || eur <= 0) {
      alert('Por favor ingrese tasas de cambio válidas mayores a 0.');
      return;
    }

    const now = Date.now();
    updateData({
      exchangeRate: {
        usdCUP: usd,
        eurCUP: eur,
        updatedAt: now
      },
      auditLogs: [
        {
          id: `LOG-${now}`,
          timestamp: now,
          timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date().toLocaleDateString('es-ES'),
          role: 'Gerente',
          userOrDevice: managerInfo?.username || 'gerente',
          action: 'Tasa de Cambio Configurada por Gerencia',
          details: `1 USD = ${usd} CUP | 1 EUR = ${eur} CUP (Vigencia 24h).`
        },
        ...(data.auditLogs || [])
      ]
    });

    setShowExchangeModal(false);
    alert('¡Tasa de cambio configurada correctamente! Ahora puede proceder a iniciar la jornada.');
  };

  const handleResetShiftClick = () => {
    if (!checkDownloads()) {
      return;
    }
    setShowResetModal(true);
  };

  const confirmResetShift = () => {
    updateData({
      orders: [],
      comandas: [],
      orderReports: [],
      kitchenReports: [],
      cashRegisterCloses: [],
      downloadsState: { adminAuditLog: false, managerZip: false },
      auditLogs: [
        {
          id: `LOG-${Date.now()}`,
          timestamp: Date.now(),
          timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date().toLocaleDateString('es-ES'),
          role: 'Gerente' as const,
          userOrDevice: managerInfo?.username || 'gerente',
          action: 'Reiniciar Jornada',
          details: 'La jornada ha sido reiniciada por el Gerente. Datos del sistema restaurados a cero.'
        }
      ]
    });
    setShowResetModal(false);
    alert('La jornada ha sido reiniciada correctamente.');
  };

  // PDF Download for Dependent Report
  const handleDownloadPDF = (report: OrderReport) => {
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
      doc.text('Informe Oficial de Órdenes - Gerente de Restaurante', 14, 26);

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Dependiente: ${report.dependentName} (@${report.dependentUsername})`, 14, 45);
      doc.text(`Mesa Asignada: ${report.tableNumber}`, 14, 52);
      doc.text(`Fecha y Hora: ${report.dateStr}`, 14, 59);

      doc.setFillColor(245, 245, 240);
      doc.roundedRect(14, 66, 182, 38, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(27, 67, 50);
      doc.text(`Total Comandas: ${report.totalOrdersCount}`, 20, 74);
      doc.text(`Total Raciones Entregadas: ${report.totalItemsCount}`, 110, 74);

      const pS = report.paymentSummary || { totalCashCUP: 0, totalDigitalCUP: 0, totalCashUSD: 0, totalDigitalUSD: 0, totalCashEUR: 0, totalDigitalEUR: 0 };
      doc.text(`Cobrado en CUP: $${(report.totalAmountCUP || 0).toLocaleString()} CUP (Efectivo: $${(pS.totalCashCUP || 0).toLocaleString()} | Digital: $${(pS.totalDigitalCUP || 0).toLocaleString()})`, 20, 81);
      doc.text(`Cobrado en USD: $${(report.totalAmountUSD || 0).toLocaleString()} USD (Efectivo: $${(pS.totalCashUSD || 0).toLocaleString()} | Digital: $${(pS.totalDigitalUSD || 0).toLocaleString()})`, 20, 88);
      doc.text(`Cobrado en EUR: €${(report.totalAmountEUR || 0).toLocaleString()} EUR (Efectivo: €${(pS.totalCashEUR || 0).toLocaleString()} | Digital: €${(pS.totalDigitalEUR || 0).toLocaleString()})`, 20, 95);

      let yPos = 112;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Platos & Raciones Entregados:', 14, yPos);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFillColor(230, 230, 225);
      doc.rect(14, yPos, 182, 8, 'F');
      doc.text('Producto / Plato', 18, yPos + 6);
      doc.text('Cantidad', 140, yPos + 6);
      yPos += 12;

      report.itemsSummary.forEach((item, i) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        if (i % 2 === 1) {
          doc.setFillColor(248, 248, 248);
          doc.rect(14, yPos - 5, 182, 8, 'F');
        }
        doc.text(`${i + 1}. ${item.name}`, 18, yPos);
        doc.text(`${item.count} raciones`, 140, yPos);
        yPos += 8;
      });

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Documento verificado desde el Panel del Gerente de Restaurante 53&M.', 14, 285);

      doc.save(`Informe_${report.id}_${report.tableNumber.replace(/\s+/g, '')}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  // Perform Cierre de Caja
  const handlePerformCierreCaja = () => {
    const totalCountedCUP = cashCUP + digitalCUP;
    const diffCUP = totalCountedCUP - totalExpectedCUP;
    const diffUSD = (cashUSD + digitalUSD) - totalExpectedUSD;
    const diffEUR = (cashEUR + digitalEUR) - totalExpectedEUR;

    let status: CashRegisterClose['status'] = 'balanced';
    if (diffCUP > 10 || diffUSD > 1 || diffEUR > 1) status = 'surplus';
    if (diffCUP < -10 || diffUSD < -1 || diffEUR < -1) status = 'shortage';

    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    const newClose: CashRegisterClose = {
      id: `CJA-${Date.now()}`,
      dateStr: todayStr,
      timestamp: Date.now(),
      managerName: managerInfo?.name || 'Gerente de Restaurante',
      countedCashCUP: cashCUP,
      countedDigitalCUP: digitalCUP,
      countedCashUSD: cashUSD,
      countedDigitalUSD: digitalUSD,
      countedCashEUR: cashEUR,
      countedDigitalEUR: digitalEUR,
      systemExpectedCUP: totalExpectedCUP,
      systemExpectedUSD: totalExpectedUSD,
      systemExpectedEUR: totalExpectedEUR,
      differenceCUP: diffCUP,
      differenceUSD: diffUSD,
      differenceEUR: diffEUR,
      kitchenDiscrepanciesCount: 0,
      status,
      notes
    };

    const updatedCloses = [newClose, ...(data.cashRegisterCloses || [])];

    // Audit log entry
    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: todayStr,
      role: 'Gerente' as const,
      userOrDevice: managerInfo?.username || 'gerente',
      action: 'Cierre Oficial de Caja',
      details: `Cierre realizado por ${newClose.managerName}. Estado: ${status.toUpperCase()}. Diferencia CUP: $${diffCUP}`
    };

    updateData({
      cashRegisterCloses: updatedCloses,
      auditLogs: [log, ...auditLogs]
    });

    alert(t('Cierre de caja oficial completado y firmado. Registro guardado en el sistema.'));
  };

  // Export Daily Audit Flow PDF
  const handleExportAuditPDF = () => {
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
      doc.text('Registro Inalterable de Auditoría y Flujo Diario', 14, 26);

      let yPos = 45;
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);

      auditLogs.forEach((log, i) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`[${log.timeStr} - ${log.dateStr}] [${log.role}] (${log.userOrDevice}) ${log.action}`, 14, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`   ${log.details}`, 14, yPos);
        yPos += 8;
      });

      doc.save(`Auditoria_FlujoRestaurante_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadManagerZip = async () => {
    try {
      const zip = new JSZip();

      // 1. Informes de Dependientes
      reports.forEach(report => {
        const doc = new jsPDF();
        doc.setFillColor(27, 67, 50);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RESTAURANTE TERRAZA 53&M', 14, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Informe Oficial de Órdenes - Dependiente', 14, 26);

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Dependiente: ${report.dependentName}`, 14, 45);
        doc.text(`Mesa: ${report.tableNumber}`, 14, 52);
        
        let yPos = 65;
        doc.text('Platos & Raciones Entregados:', 14, yPos);
        yPos += 8;
        report.itemsSummary.forEach((item, i) => {
          doc.setFont('helvetica', 'normal');
          doc.text(`${item.count}x ${item.name}`, 18, yPos);
          yPos += 6;
        });
        
        zip.file(`Dependiente_${report.dependentName}_${report.tableNumber}.pdf`, doc.output('blob'));
      });

      // 2. Informe de Cocina
      if (kitchenReports.length > 0) {
        const kReport = kitchenReports[0];
        const doc = new jsPDF();
        doc.setFillColor(27, 67, 50);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RESTAURANTE TERRAZA 53&M', 14, 18);
        doc.setFontSize(11);
        doc.text('Informe de Cocina', 14, 26);
        
        doc.setTextColor(40, 40, 40);
        doc.text(`Total Platos Preparados: ${kReport.totalDishesPrepared}`, 14, 45);
        let yPos = 55;
        kReport.dishesSummary.forEach(dish => {
          doc.setFont('helvetica', 'normal');
          doc.text(`${dish.count}x ${dish.name}`, 18, yPos);
          yPos += 6;
        });
        
        zip.file(`Informe_Cocina.pdf`, doc.output('blob'));
      }

      // 3. Cierre de Caja
      if (cashRegisterCloses.length > 0) {
        const caja = cashRegisterCloses[0];
        const doc = new jsPDF();
        doc.setFillColor(27, 67, 50);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RESTAURANTE TERRAZA 53&M', 14, 18);
        doc.setFontSize(11);
        doc.text('Cierre de Caja', 14, 26);

        doc.setTextColor(40, 40, 40);
        doc.text(`Gerente: ${caja.managerName}`, 14, 45);
        doc.text(`Estado: ${caja.status.toUpperCase()}`, 14, 52);
        doc.text(`Diferencia CUP: $${caja.differenceCUP}`, 14, 59);

        zip.file(`Cierre_Caja.pdf`, doc.output('blob'));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      const todayStr = new Date().toISOString().split('T')[0];
      link.download = `Informes_Gerente_${todayStr}.zip`;
      link.click();
      
      updateData({
        downloadsState: { ...(data.downloadsState || { adminAuditLog: false }), managerZip: true }
      });

    } catch (e) {
      console.error(e);
      alert('Hubo un error al generar el ZIP.');
    }
  };

  const handleConfirmPresence = (res: Reservation) => {
    if (!data.isShiftActive) {
      alert('⚠️ No se puede confirmar presencia si la jornada no está activa.');
      return;
    }

    const table = prompt(`Asigne una mesa para ${res.name} (1-6 o nombre de área):`, res.tableNumber || 'Mesa 1');
    if (!table) return;

    // 1. Update reservation status to confirmed/paid (if not already)
    updateStatus(res.id, 'confirmed');

    // 2. If there are pre-ordered dishes, create an order automatically
    if (res.dishes && res.dishes.length > 0) {
      const orderItems = res.dishes.map(d => ({
        name: d.name,
        quantity: d.quantity,
        priceCUP: d.priceCUP || (data.menuItems.find(m => m.name === d.name)?.priceCUP || 0)
      }));

      const newOrder: any = {
        id: `ORD-RES-${Date.now()}`,
        tableNumber: table,
        items: res.dishes.map(d => `${d.quantity}x ${d.name}`),
        orderItems,
        status: 'pending',
        timestamp: Date.now(),
        reservationId: res.id
      };

      const updatedOrders = [...(data.orders || []), newOrder];
      updateData({ orders: updatedOrders });
      
      const log = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        dateStr: new Date().toLocaleDateString('es-ES'),
        role: 'Gerente' as const,
        userOrDevice: managerInfo?.username || 'gerente',
        action: 'Presencia Confirmada (Reserva)',
        details: `El Gerente confirmó la presencia de ${res.name} en ${table}. Se generó pedido automático con platos pre-ordenados.`
      };
      updateData({ auditLogs: [log, ...(data.auditLogs || [])] });

      alert(`¡Presencia confirmada en ${table}! El pedido pre-ordenado ha sido enviado a los dependientes.`);
    } else {
      alert(`Presencia confirmada de ${res.name} en ${table}. El cliente puede proceder a realizar su pedido.`);
    }
  };

  return (
    <div className="pt-28 pb-20 px-4 max-w-7xl mx-auto min-h-screen bg-stone-50">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-dark-green" size={22} />
            <span className="text-xs font-bold uppercase tracking-wider text-gold bg-dark-green px-3 py-1 rounded-full">
              {t('Gerente de Restaurante')}
            </span>
          </div>
          <h2 className="text-3xl font-serif text-dark-green">
            {managerInfo?.name || t('Panel de Gerencia del Restaurante')}
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            {t('Supervisión operativa, informes de dependientes/cocina, Cierre de Caja y auditoría inalterable')}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          {managerInfo?.phone && (
            <div className="bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-2xl text-right w-full">
              <div className="text-[11px] font-mono text-stone-400 uppercase">{t('Móvil Registrado')}</div>
              <div className="font-mono font-bold text-stone-800 text-sm">{managerInfo.phone}</div>
            </div>
          )}
          <button
            onClick={handleDownloadManagerZip}
            className="relative bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center gap-2"
          >
            <Download size={16} /> Descargar Informes (ZIP)
            {data.downloadsState?.managerZip && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Exchange Rate Status Banner */}
      {isRateExpired ? (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-200 text-amber-800 rounded-2xl shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">⚠️ Tasa de Cambio no configurada o vencida (+24h)</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                El Administrador no ha actualizado la tasa de cambio hoy. Como Gerente, debe configurarla para permitir el inicio de jornada y la expresión de precios en CUP, USD y EUR.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setMgrUsdRate(data.exchangeRate?.usdCUP || 320);
              setMgrEurRate(data.exchangeRate?.eurCUP || 350);
              setShowExchangeModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-md shrink-0 flex items-center gap-2"
          >
            <DollarSign size={16} /> Configurar Tasa de Cambio
          </button>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-8 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2 text-stone-700">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
            <span>
              Tasa de cambio vigente (24h): <strong className="text-dark-green">1 USD = {data.exchangeRate?.usdCUP} CUP</strong> | <strong className="text-dark-green">1 EUR = {data.exchangeRate?.eurCUP} CUP</strong> (Actualizada: {new Date(data.exchangeRate!.updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})
            </span>
          </div>
          <button
            onClick={() => {
              setMgrUsdRate(data.exchangeRate?.usdCUP || 320);
              setMgrEurRate(data.exchangeRate?.eurCUP || 350);
              setShowExchangeModal(true);
            }}
            className="text-dark-green font-bold hover:underline ml-2"
          >
            Modificar
          </button>
        </div>
      )}

      {/* Shift Status (Read-Only for Manager) */}
      <div className={`p-6 rounded-3xl mb-8 border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isShiftActive ? 'bg-emerald-950 text-white border-emerald-800' : 'bg-red-950 text-white border-red-800'}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isShiftActive ? 'bg-emerald-500 text-stone-950' : 'bg-red-500 text-white'}`}>
              {isShiftActive ? '🟢 Jornada Operativa Activa' : '🔴 Jornada Inactiva (Detenida)'}
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold mt-2">
            {isShiftActive ? 'Sistema de Atención y Comandas en Marcha' : 'Jornada Detenida por Administrador'}
          </h3>
          <p className="text-xs opacity-80 mt-1 max-w-lg">
            {isShiftActive 
              ? 'Los dependientes pueden abrir comandas, mandar a cocina y cobrar mesas normalmente.' 
              : 'El sistema está bloqueado para dependientes y cocina. Solicite al Administrador iniciar la jornada operacional.'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'reports' ? 'bg-dark-green text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
          }`}
        >
          <FileText size={16} /> {t('Informes')} ({reports.length + kitchenReports.length})
        </button>

        <button
          onClick={() => setActiveTab('comparative')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'comparative' ? 'bg-dark-green text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Scale size={16} /> {t('Comparativa Cocina vs Dependientes')}
        </button>

        <button
          onClick={() => setActiveTab('cierre_caja')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'cierre_caja' ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <DollarSign size={16} /> {t('Procedimiento Cierre de Caja')}
        </button>

        <button
          onClick={() => setActiveTab('audit_log')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'audit_log' ? 'bg-stone-900 text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Lock size={16} /> {t('Registro Inalterable de Auditoría')}
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'reservations' ? 'bg-dark-green text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
          }`}
        >
          <CalendarCheck size={16} /> {t('Reservas (Solo Lectura)')}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'history' ? 'bg-dark-green text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Database size={16} /> {t('Historial')}
        </button>
      </div>

      {/* TAB 1: INFORMES */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
          <h3 className="font-serif text-2xl text-stone-900">{t('Informes Recibidos')}</h3>
          <p className="text-xs text-stone-500">
            {t('Aquí se muestran los informes enviados por los dependientes y el informe final de cocina.')}
          </p>

          {(reports.length === 0 && kitchenReports.length === 0) ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl">
              <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">{t('No se han recibido informes aún.')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cocina Reports */}
              {kitchenReports.map((kr, idx) => (
                <div key={`kitchen-${kr.id}-${idx}`} className="border border-amber-200 rounded-2xl p-5 bg-amber-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">COCINA</span>
                      <span className="font-bold text-amber-900 text-sm">Informe Final de Cocina</span>
                    </div>
                    <div className="text-xs text-amber-800 flex flex-wrap gap-4 mt-2">
                      <span>📅 {kr.dateStr}</span>
                      <span>🍽️ {kr.totalDishesPrepared} Platos Preparados</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Dependent Reports */}
              {reports.map((report, idx) => (
                <div
                  key={`dependent-${report.id}-${idx}`}
                  className="border border-stone-200 rounded-2xl p-5 bg-stone-50 hover:bg-white transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-dark-green text-white text-xs font-bold px-3 py-1 rounded-full">
                        {report.tableNumber}
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{report.dependentName}</span>
                      <span className="text-xs text-stone-400 font-mono">(@{report.dependentUsername})</span>
                    </div>

                    <div className="text-xs text-stone-600 flex flex-wrap gap-4 mt-2">
                      <span>📅 {report.dateStr}</span>
                      <span>📦 {report.totalOrdersCount} {t('Comandas')}</span>
                      <span>🍽️ {report.totalItemsCount} {t('Raciones Servidas')}</span>
                      <span className="font-bold text-dark-green">
                        💰 ${report.totalAmountCUP || 0} CUP (USD: ${report.totalAmountUSD || 0} | EUR: €{report.totalAmountEUR || 0})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      {t('Ver Detalle')}
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(report)}
                      className="bg-dark-green hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Download size={14} /> {t('PDF')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPARATIVA COCINA VS DEPENDIENTES */}
      {activeTab === 'comparative' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
              <Scale size={24} />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-stone-900">
                {t('Comparativa Auditable: Cocina vs. Dependientes')}
              </h3>
              <p className="text-xs text-stone-500">
                {t('Cruce automático entre platos elaborados en Cocina e informes cobrados por Dependientes.')}
              </p>
            </div>
          </div>

          {kitchenReports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl space-y-2">
              <ChefHat className="mx-auto text-stone-300" size={40} />
              <p className="text-stone-600 font-bold text-sm">{t('No hay informes de Cocina subidos hoy.')}</p>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                {t('Cuando el Jefe de Cocina envíe el informe diario, el sistema cruzará automáticamente las raciones para mostrar coincidencias o desajustes.')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {kitchenReports.map((kRep, idx) => {
                // Compile dependent totals using only LATEST reports
                const dependentDishesMap: { [dishName: string]: number } = {};
                latestReports.forEach(r => {
                  r.itemsSummary.forEach(it => {
                    dependentDishesMap[it.name] = (dependentDishesMap[it.name] || 0) + it.count;
                  });
                });

                return (
                  <div key={`kitchen-comp-${kRep.id}-${idx}`} className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-4">
                    <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">{t('Informe de Cocina')} #{kRep.id.slice(-4)}</span>
                        <h4 className="font-serif font-bold text-lg text-stone-900">{kRep.chefName} — {kRep.dateStr}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                          {kRep.totalDishesPrepared} {t('Platos Elaborados')}
                        </span>
                      </div>
                    </div>

                    {/* Comparison Matrix Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-stone-200/70 text-stone-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3 rounded-l-xl">{t('Plato / Ración')}</th>
                            <th className="p-3">{t('Elaborados en Cocina')}</th>
                            <th className="p-3">{t('Facturados por Dependientes')}</th>
                            <th className="p-3 rounded-r-xl">{t('Estado / Desajuste')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 font-medium">
                          {kRep.dishesSummary.map((dItem, idx) => {
                            const billedCount = dependentDishesMap[dItem.name] || 0;
                            const diff = billedCount - dItem.count;
                            const isExact = diff === 0;

                            return (
                              <tr key={idx} className="hover:bg-white/80">
                                <td className="p-3 font-bold text-stone-900">{dItem.name}</td>
                                <td className="p-3 font-mono font-bold text-stone-700">{dItem.count}</td>
                                <td className="p-3 font-mono font-bold text-stone-700">{billedCount}</td>
                                <td className="p-3">
                                  {isExact ? (
                                    <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                                      ✓ {t('Coincidencia Exacta')}
                                    </span>
                                  ) : (
                                    <span className={`font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                                      diff < 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      <AlertTriangle size={12} />
                                      {diff < 0 ? `${t('Faltante:')} ${diff} ${t('raciones')}` : `${t('Sobrante:')} +${diff} ${t('raciones')}`}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROCEDIMIENTO Y PANEL DE CIERRE DE CAJA */}
      {activeTab === 'cierre_caja' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-8">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                {t('Procedimiento Oficial')}
              </span>
              <h3 className="font-serif text-2xl text-stone-900 mt-2">
                {t('Panel de Arqueo & Cierre Diarios de Caja')}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">{t('Esperado por Sistema (CUP):')}</span>
              <div className="text-2xl font-serif font-bold text-dark-green">${totalExpectedCUP} CUP</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-6">
              <h4 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-200 pb-2">
                1. {t('Conteo Físico & Digital en Caja')}
              </h4>

              {/* CUP */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700">🇨🇺 Moneda CUP:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-stone-500 font-semibold">{t('Efectivo CUP')}</label>
                    <input
                      type="number"
                      value={cashCUP || ''}
                      onChange={e => setCashCUP(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-xs border border-stone-300 rounded-xl p-2.5 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 font-semibold">{t('Digital CUP (Transfermóvil/EnZona)')}</label>
                    <input
                      type="number"
                      value={digitalCUP || ''}
                      onChange={e => setDigitalCUP(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-xs border border-stone-300 rounded-xl p-2.5 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* USD */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700">🇺🇸 Moneda USD:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-stone-500 font-semibold">{t('Efectivo USD')}</label>
                    <input
                      type="number"
                      value={cashUSD || ''}
                      onChange={e => setCashUSD(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-xs border border-stone-300 rounded-xl p-2.5 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 font-semibold">{t('Digital USD')}</label>
                    <input
                      type="number"
                      value={digitalUSD || ''}
                      onChange={e => setDigitalUSD(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-xs border border-stone-300 rounded-xl p-2.5 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* EUR */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700">🇪🇺 Moneda EUR:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-stone-500 font-semibold">{t('Efectivo EUR')}</label>
                    <input
                      type="number"
                      value={cashEUR || ''}
                      onChange={e => setCashEUR(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-xs border border-stone-300 rounded-xl p-2.5 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 font-semibold">{t('Digital EUR')}</label>
                    <input
                      type="number"
                      value={digitalEUR || ''}
                      onChange={e => setDigitalEUR(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-xs border border-stone-300 rounded-xl p-2.5 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{t('Observaciones del Cierre:')}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('Ej: Todo en orden, sin novedades en la jornada.')}
                  className="w-full text-xs border border-stone-300 rounded-xl p-2.5 bg-white"
                />
              </div>

              <button
                onClick={handlePerformCierreCaja}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> {t('Firmar & Validar Cierre Oficial de Caja')}
              </button>
            </div>

            {/* Reconciliation Live Card */}
            <div className="space-y-6">
              <div className="bg-stone-900 text-white p-6 rounded-3xl border border-stone-800 space-y-4 shadow-xl">
                <h4 className="font-serif font-bold text-lg text-gold">2. {t('Total Arqueado por Moneda')}</h4>

                <div className="space-y-4 text-xs border-t border-stone-800 pt-4">
                  {/* CUP Breakdown */}
                  <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-gold">
                      <span>🇨🇺 CUP Total Arqueado:</span>
                      <span className="font-mono text-white text-sm">${cashCUP + digitalCUP} CUP</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-stone-400">
                      <span>Esperado Sistema CUP:</span>
                      <span className="font-mono text-amber-300">${totalExpectedCUP} CUP</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-stone-700/60">
                      <span className="text-stone-300 font-semibold">Diferencia CUP:</span>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        (cashCUP + digitalCUP - totalExpectedCUP) === 0 ? 'bg-green-900/80 text-green-300' :
                        (cashCUP + digitalCUP - totalExpectedCUP) > 0 ? 'bg-blue-900/80 text-blue-300' :
                        'bg-red-900/80 text-red-300'
                      }`}>
                        ${cashCUP + digitalCUP - totalExpectedCUP} CUP
                      </span>
                    </div>
                  </div>

                  {/* USD Breakdown */}
                  <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-gold">
                      <span>🇺🇸 USD Total Arqueado:</span>
                      <span className="font-mono text-white text-sm">${cashUSD + digitalUSD} USD</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-stone-400">
                      <span>Esperado Sistema USD:</span>
                      <span className="font-mono text-amber-300">${totalExpectedUSD} USD</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-stone-700/60">
                      <span className="text-stone-300 font-semibold">Diferencia USD:</span>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        (cashUSD + digitalUSD - totalExpectedUSD) === 0 ? 'bg-green-900/80 text-green-300' :
                        (cashUSD + digitalUSD - totalExpectedUSD) > 0 ? 'bg-blue-900/80 text-blue-300' :
                        'bg-red-900/80 text-red-300'
                      }`}>
                        ${cashUSD + digitalUSD - totalExpectedUSD} USD
                      </span>
                    </div>
                  </div>

                  {/* EUR Breakdown */}
                  <div className="bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/60 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-gold">
                      <span>🇪🇺 EUR Total Arqueado:</span>
                      <span className="font-mono text-white text-sm">€{cashEUR + digitalEUR} EUR</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-stone-400">
                      <span>Esperado Sistema EUR:</span>
                      <span className="font-mono text-amber-300">€{totalExpectedEUR} EUR</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-stone-700/60">
                      <span className="text-stone-300 font-semibold">Diferencia EUR:</span>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        (cashEUR + digitalEUR - totalExpectedEUR) === 0 ? 'bg-green-900/80 text-green-300' :
                        (cashEUR + digitalEUR - totalExpectedEUR) > 0 ? 'bg-blue-900/80 text-blue-300' :
                        'bg-red-900/80 text-red-300'
                      }`}>
                        €{cashEUR + digitalEUR - totalExpectedEUR} EUR
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Closes */}
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-3">
                <h4 className="font-serif font-bold text-sm text-stone-800">{t('Historial de Cierres de Caja')}</h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {cashRegisterCloses.map((c, idx) => (
                    <div key={`caja-${c.id}-${idx}`} className="p-3 bg-white rounded-xl border border-stone-200 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-stone-900">{c.dateStr} — {c.managerName}</div>
                        <div className="text-[10px] text-stone-400">ID: {c.id}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        c.status === 'balanced' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.status} (Diff: ${c.differenceCUP} CUP)
                      </span>
                    </div>
                  ))}

                  {cashRegisterCloses.length === 0 && (
                    <div className="text-stone-400 text-xs text-center py-4">
                      {t('No hay cierres de caja firmados aún.')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REGISTRO INALTERABLE DE AUDITORIA */}
      {activeTab === 'audit_log' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-stone-900 text-white rounded-2xl">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-stone-900">{t('Registro Inalterable de Auditoría (Read-Only)')}</h3>
                <p className="text-xs text-stone-500">
                  {t('Bitácora oficial de eventos en tiempo real. No editable por administradores ni usuarios.')}
                </p>
              </div>
            </div>

            <button
              onClick={handleExportAuditPDF}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Printer size={15} /> {t('Exportar Informe PDF de Flujo')}
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs max-h-[500px] overflow-y-auto pr-2">
            {auditLogs.map((log, idx) => (
              <div key={`log-${log.id}-${idx}`} className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-stone-800 text-gold font-bold px-2 py-0.5 rounded">
                      {log.timeStr}
                    </span>
                    <span className="font-bold text-dark-green">[{log.role}]</span>
                    <span className="text-stone-700 font-bold">{log.action}</span>
                  </div>
                  <div className="text-stone-600 mt-1 text-[11px] font-sans">{log.details}</div>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">@{log.userOrDevice}</span>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="text-center py-12 text-stone-400 text-xs border border-dashed border-stone-200 rounded-2xl">
                {t('Aún no hay registros en la bitácora inalterable.')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RESERVAS (SOLO LECTURA PARA GERENTE) */}
      {activeTab === 'reservations' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-serif text-2xl text-stone-900">{t('Estado de Reservas (Vista Gerencial)')}</h3>
              <p className="text-xs text-amber-700 font-medium mt-1">
                ℹ️ {t('Nota: La aprobación y cobro de reservas es gestionado exclusivamente por el Administrador.')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {reservations
              .filter(r => r.status !== 'cancelled') // Typically manager only sees active ones, but I'll follow Admin sort logic
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((res, idx) => (
                <div key={`res-${res.id}-${idx}`} className="border border-stone-200 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-stone-50 hover:bg-white transition-all shadow-sm">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-dark-green text-white flex items-center justify-center font-bold text-sm">
                        {res.time}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-sm">{res.name}</div>
                        <div className="text-[11px] text-stone-500 font-medium">{res.date} • {res.guests} pax • {res.occasion}</div>
                      </div>
                    </div>
                    
                    {res.dishes && res.dishes.length > 0 && (
                      <div className="ml-13 bg-white border border-stone-100 rounded-xl p-3 text-[11px]">
                        <p className="font-bold text-dark-green mb-1 flex items-center gap-1">
                          <Utensils size={12} /> {t('Platos Pre-ordenados:')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                          {res.dishes.map((dish, i) => (
                            <div key={i} className="flex justify-between border-b border-stone-50 pb-1 last:border-0">
                              <span className="text-stone-700">{dish.name}</span>
                              <span className="font-bold">x{dish.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      res.status === 'confirmed' || res.status === 'paid' ? 'bg-green-100 text-green-700' :
                      res.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {res.status === 'confirmed' || res.status === 'paid' ? t('Confirmada') : res.status === 'pending' ? t('Pendiente') : t('Cancelada')}
                    </span>
                    
                    {res.status !== 'cancelled' && (
                      <button
                        onClick={() => handleConfirmPresence(res)}
                        className="flex-1 md:flex-none bg-gold hover:bg-amber-500 text-stone-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle2 size={14} /> {t('Confirmar Presencia')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {reservations.filter(r => r.status !== 'cancelled').length === 0 && (
              <div className="text-center py-10 border border-dashed border-stone-200 rounded-3xl">
                <CalendarCheck className="mx-auto text-stone-200 mb-2" size={40} />
                <p className="text-stone-400 text-sm font-medium">{t('No hay reservas activas en el sistema.')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: HISTORIAL DE JORNADAS */}
      {activeTab === 'history' && (
        <HistoryViewer data={data} userRole="manager" />
      )}

      {/* REPORT DETAIL MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 p-1 font-bold text-lg"
            >
              ✕
            </button>

            <h3 className="font-serif text-2xl text-dark-green mb-1">{t('Detalle del Informe de Turno')}</h3>
            <p className="text-xs text-stone-500 mb-6">
              Mesa {selectedReport.tableNumber} • Atendido por {selectedReport.dependentName}
            </p>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 mb-6 space-y-3 text-xs text-stone-800">
              <div><strong>{t('Fecha:')}</strong> {selectedReport.dateStr}</div>
              <div><strong>{t('Dependiente:')}</strong> {selectedReport.dependentName} (@{selectedReport.dependentUsername})</div>
              <div><strong>{t('Comandas Atendidas:')}</strong> {selectedReport.totalOrdersCount}</div>
              <div><strong>{t('Total Raciones Servidas:')}</strong> {selectedReport.totalItemsCount}</div>
              <div className="border-t border-stone-200 pt-2 space-y-1">
                <strong>{t('Desglose de Recaudación:')}</strong>
                {(() => {
                  const pS = selectedReport.paymentSummary || { totalCashCUP: 0, totalDigitalCUP: 0, totalCashUSD: 0, totalDigitalUSD: 0, totalCashEUR: 0, totalDigitalEUR: 0 };
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-dark-green">🇨🇺 CUP: ${(selectedReport.totalAmountCUP || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500">Efec: ${(pS.totalCashCUP || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500">Dig: ${(pS.totalDigitalCUP || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-amber-800">🇺🇸 USD: ${(selectedReport.totalAmountUSD || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500">Efec: ${(pS.totalCashUSD || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500">Dig: ${(pS.totalDigitalUSD || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-blue-800">🇪🇺 EUR: €{(selectedReport.totalAmountEUR || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500">Efec: €{(pS.totalCashEUR || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500">Dig: €{(pS.totalDigitalEUR || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <h4 className="font-bold text-xs text-stone-800 mb-3 uppercase tracking-wider">{t('Comandas Cobradas en este Turno:')}</h4>
            <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
              {selectedReport.comandas && selectedReport.comandas.map((c, idx) => (
                <div key={idx} className="p-3 border border-stone-200 rounded-xl bg-stone-50/50 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-stone-900">
                    <span>Comanda #{c.comandaId} - Mesa {c.tableNumber}</span>
                    <span className="text-dark-green font-mono font-bold">
                      {c.paymentSummaryStr || `$${c.totalAmount?.toLocaleString()} CUP`}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500 text-[10px]">
                    <span>Método: <strong className="uppercase">{c.paymentMethod}</strong></span>
                    {c.closedAt && (
                      <span>Hora: {new Date(c.closedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                  {c.currencyBreakdown && (
                    <div className="text-[9px] text-emerald-800 bg-emerald-50/50 px-2 py-1 rounded border border-emerald-100 font-mono">
                      Cobrado: 
                      {c.currencyBreakdown.CUP !== undefined && ` [CUP: $${c.currencyBreakdown.CUP.toLocaleString()}]`}
                      {c.currencyBreakdown.USD !== undefined && ` [USD: $${c.currencyBreakdown.USD.toLocaleString()}]`}
                      {c.currencyBreakdown.EUR !== undefined && ` [EUR: €${c.currencyBreakdown.EUR.toLocaleString()}]`}
                    </div>
                  )}
                </div>
              ))}
              {(!selectedReport.comandas || selectedReport.comandas.length === 0) && (
                <p className="text-stone-400 text-xs italic">{t('No hay comandas registradas en este informe.')}</p>
              )}
            </div>

            <h4 className="font-bold text-xs text-stone-800 mb-3 uppercase tracking-wider">{t('Platos & Raciones Entregados:')}</h4>
            <div className="space-y-2 mb-6">
              {selectedReport.itemsSummary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border border-stone-200 rounded-xl bg-white text-xs">
                  <span className="font-bold text-stone-900">{item.name}</span>
                  <span className="font-bold text-dark-green bg-green-50 px-3 py-1 rounded-lg">
                    {item.count} {t('raciones')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
              >
                {t('Cerrar')}
              </button>
              <button
                onClick={() => {
                  handleDownloadPDF(selectedReport);
                  setSelectedReport(null);
                }}
                className="bg-dark-green text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-stone-800 transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Download size={14} /> {t('Descargar PDF')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExchangeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowExchangeModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <DollarSign size={24} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-xl text-stone-900">Configurar Tasa de Cambio Diaria</h3>
                <p className="text-xs text-stone-500">Defina la tasa de cambio CUP oficial (USD y EUR)</p>
              </div>
            </div>

            <form onSubmit={handleSaveManagerExchangeRate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  1 USD (Dólar) en CUP ($) *
                </label>
                <input 
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={mgrUsdRate}
                  onChange={e => setMgrUsdRate(Number(e.target.value))}
                  className="w-full border-stone-200 rounded-xl py-2.5 px-4 text-sm font-mono font-bold focus:border-dark-green outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  1 EUR (Euro) en CUP ($) *
                </label>
                <input 
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={mgrEurRate}
                  onChange={e => setMgrEurRate(Number(e.target.value))}
                  className="w-full border-stone-200 rounded-xl py-2.5 px-4 text-sm font-mono font-bold focus:border-dark-green outline-none"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-200">
                ⚠️ Al guardar, la tasa de cambio quedará registrada a nombre de la Gerencia con 24 horas de vigencia y permitirá iniciar la jornada.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExchangeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 border border-stone-200 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-dark-green hover:bg-stone-800 shadow-md"
                >
                  Guardar y Activar Tasa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-serif font-bold text-xl text-stone-900">¿Desea reiniciar la jornada?</h3>
            <p className="text-xs text-stone-600">
              Se restablecerán todas las órdenes, comandas, bitácora e informes de la sesión actual.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetShift}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700"
              >
                Confirmar Reinicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
