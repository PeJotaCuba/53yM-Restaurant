import React, { useState } from 'react';
import { AppData, Order, KitchenConfig, KitchenReport, AppNotification } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Send, 
  Utensils, 
  FileCheck, 
  RefreshCw, 
  Layers,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

interface KitchenPanelProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  kitchenInfo: KitchenConfig;
}

export function KitchenPanel({ data, updateData, kitchenInfo }: KitchenPanelProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'ready'>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const orders = data.orders || [];

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (filter === 'pending') return o.status === 'pending';
    if (filter === 'in_progress') return o.status === 'kitchen_in_progress';
    if (filter === 'ready') return o.status === 'kitchen_ready';
    return true;
  });

  const isShiftActive = data.isShiftActive !== false;

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    if (!isShiftActive) {
      alert(t('⚠️ La jornada no está activa. El Administrador debe iniciar la jornada para procesar comandas.'));
      return;
    }
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    
    const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);

    // If marked as ready, generate PDF
    if (status === 'kitchen_ready') {
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
        doc.text('Ticket de Plato Terminado', 14, 26);

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Mesa: ${targetOrder.tableNumber}`, 14, 45);
        doc.text(`Pedido: #${targetOrder.id}`, 14, 52);
        
        let yPos = 65;
        doc.text('Platos Listos para Servir:', 14, yPos);
        yPos += 8;
        
        if (targetOrder.orderItems && targetOrder.orderItems.length > 0) {
          targetOrder.orderItems.forEach(item => {
            doc.setFont('helvetica', 'normal');
            doc.text(`${item.quantity}x ${item.name}`, 18, yPos);
            yPos += 6;
          });
        } else {
          targetOrder.items.forEach(item => {
            doc.setFont('helvetica', 'normal');
            doc.text(`- ${item}`, 18, yPos);
            yPos += 6;
          });
        }
        
        yPos += 10;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Descargado en la carpeta /Cocina/`, 14, yPos);

        const pdfName = `Cocina/PlatoTerminado_Mesa${targetOrder.tableNumber.replace(/\s+/g, '')}_${Date.now()}.pdf`;
        doc.save(pdfName);
      } catch (e) {
        console.error('Error generating kitchen ready PDF:', e);
      }
    }

    const newNotifications: AppNotification[] = [...(data.notifications || [])];

    if (status === 'kitchen_ready') {
      const depNotif: AppNotification = {
        id: `NOTIF-DEP-${Date.now()}`,
        timestamp: Date.now(),
        orderId: targetOrder.id,
        tableNumber: targetOrder.tableNumber,
        targetRole: 'dependent',
        title: '🔔 ¡Pedido Listo en Cocina!',
        message: `El pedido de la ${targetOrder.tableNumber} está listo en cocina. ¡Pasa a recogerlo y servir!`
      };

      const clientNotif: AppNotification = {
        id: `NOTIF-CLI-${Date.now()}`,
        timestamp: Date.now(),
        orderId: targetOrder.id,
        tableNumber: targetOrder.tableNumber,
        targetRole: 'client',
        title: '🍽️ ¡Tu Pedido está Listo!',
        message: `¡Tu pedido para la ${targetOrder.tableNumber} ha sido preparado en cocina y está listo para servir!`
      };

      newNotifications.unshift(depNotif, clientNotif);
    }

    const statusLabel = 
      status === 'kitchen_in_progress' ? 'En preparación' :
      status === 'kitchen_ready' ? 'Listo para servir' :
      status === 'delivered' ? 'Entregado a mesa' : status;

    const log = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString('es-ES'),
      role: 'Cocina' as const,
      userOrDevice: kitchenInfo.username || 'cocina',
      action: `Cocina: ${statusLabel}`,
      details: `Cambió estado del pedido #${orderId} (${targetOrder.tableNumber || 'Mesa'}) a '${statusLabel}'${status === 'kitchen_ready' ? ' y notificó al dependiente y cliente.' : ''}`
    };

    updateData({
      orders: updated,
      notifications: newNotifications,
      auditLogs: [log, ...(data.auditLogs || [])]
    });
  };

  // Compile Kitchen End-of-Day Report
  const handleGenerateKitchenReport = () => {
    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    if (orders.length === 0) {
      alert(`❌ No se pudo generar el informe de Cocina.\n\nMotivo: No hay ningún pedido o comanda registrada en la jornada actual para procesar en cocina.\n\nPor favor, registre pedidos desde las mesas o paneles de clientes antes de intentar generar este informe.`);
      return;
    }

    // Group orders by table / dependent
    const dishesSummaryMap: { [dishName: string]: number } = {};
    const dependentSegmentMap: { [depName: string]: { tableNumber: string; ordersCount: number; dishes: { [name: string]: number } } } = {};

    let totalDishes = 0;

    orders.forEach(order => {
      // Find dependent matching this order's table if any
      const matchingDep = (data.dependents || []).find(d => d.tableNumber === order.tableNumber);
      const depName = matchingDep ? matchingDep.name : `Mesa (${order.tableNumber})`;

      if (!dependentSegmentMap[depName]) {
        dependentSegmentMap[depName] = {
          tableNumber: order.tableNumber,
          ordersCount: 0,
          dishes: {}
        };
      }
      dependentSegmentMap[depName].ordersCount++;

      if (order.orderItems && order.orderItems.length > 0) {
        order.orderItems.forEach(item => {
          dishesSummaryMap[item.name] = (dishesSummaryMap[item.name] || 0) + item.quantity;
          dependentSegmentMap[depName].dishes[item.name] = (dependentSegmentMap[depName].dishes[item.name] || 0) + item.quantity;
          totalDishes += item.quantity;
        });
      } else {
        order.items.forEach(rawItem => {
          // Parse "2x Dish" or raw dish string
          const match = rawItem.match(/^(\d+)x\s+(.+)$/);
          const qty = match ? parseInt(match[1]) : 1;
          const name = match ? match[2] : rawItem;

          dishesSummaryMap[name] = (dishesSummaryMap[name] || 0) + qty;
          dependentSegmentMap[depName].dishes[name] = (dependentSegmentMap[depName].dishes[name] || 0) + qty;
          totalDishes += qty;
        });
      }
    });

    // Check for duplicate reports
    const duplicateReport = (data.kitchenReports || []).find(rep => {
      return rep.totalOrdersProcessed === orders.length && rep.totalDishesPrepared === totalDishes;
    });

    if (duplicateReport) {
      alert(`⚠️ El informe de Cocina no se generó porque está DUPLICADO.\n\nYa se había enviado un informe idéntico (Reporte ID: ${duplicateReport.id}) con la misma cantidad de pedidos (${orders.length}) y platos elaborados (${totalDishes}) a la Gerencia.\n\nNo hay nuevas comandas elaboradas por reportar.`);
      setIsReportModalOpen(false);
      return;
    }

    const segmentedByDependent = Object.keys(dependentSegmentMap).map(depName => ({
      dependentName: depName,
      tableNumber: dependentSegmentMap[depName].tableNumber,
      ordersCount: dependentSegmentMap[depName].ordersCount,
      dishesPrepared: Object.keys(dependentSegmentMap[depName].dishes).map(dName => ({
        name: dName,
        count: dependentSegmentMap[depName].dishes[dName]
      }))
    }));

    const dishesSummary = Object.keys(dishesSummaryMap).map(dName => ({
      name: dName,
      count: dishesSummaryMap[dName]
    }));

    const newReport: KitchenReport = {
      id: `KIT-REP-${Date.now()}`,
      dateStr: todayStr,
      timestamp: Date.now(),
      chefName: kitchenInfo.name || 'Jefe de Cocina',
      totalOrdersProcessed: orders.length,
      totalDishesPrepared: totalDishes,
      segmentedByDependent,
      dishesSummary
    };

    const updatedReports = [newReport, ...(data.kitchenReports || [])];
    
    // Also append to audit logs
    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateStr: todayStr,
      role: 'Cocina' as const,
      userOrDevice: kitchenInfo.username || 'cocina',
      action: 'Envío de Informe Diario de Cocina',
      details: `Procesó ${orders.length} comandas con ${totalDishes} platos elaborados. Enviado al Gerente de Restaurante.`
    };

    updateData({
      kitchenReports: updatedReports,
      auditLogs: [newLog, ...(data.auditLogs || [])]
    });

    setIsReportModalOpen(false);
    alert(`✅ ¡Informe de Cocina generado con éxito!\n\nSe ha enviado al Gerente de Restaurante de forma inmediata.\n\nResumen del informe:\n• Pedidos procesados en Cocina: ${orders.length}\n• Platos elaborados totales: ${totalDishes}\n\nLos datos ya están sincronizados en el Panel de Gerencia.`);
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {!isShiftActive && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-amber-400 flex-shrink-0" size={24} />
            <div>
              <strong className="text-amber-300 text-sm font-bold">{t('Jornada Inactiva')}</strong>
              <p className="text-xs text-amber-200/80">{t('El Administrador no ha iniciado la jornada del día. Las comandas recibidas estarán pausadas.')}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-stone-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-stone-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30">
              <ChefHat size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-widest text-gold bg-stone-800 px-2.5 py-0.5 rounded-full border border-stone-700">
                  {t('Comandas en Vivo')}
                </span>
                <span className="text-xs text-stone-400 font-mono">@{kitchenInfo.username}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
                {kitchenInfo.name || t('Panel General de Cocina')}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-3 rounded-2xl text-xs md:text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send size={16} /> {t('Generar Informe Diario a Gerencia')}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('Filtrar Comandas:')}</span>
            <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                {t('Todas')} ({orders.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'pending' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                {t('Pendientes')} ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'in_progress' ? 'bg-blue-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                {t('En Preparación')} ({orders.filter(o => o.status === 'kitchen_in_progress').length})
              </button>
              <button
                onClick={() => setFilter('ready')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'ready' ? 'bg-green-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                {t('Listos')} ({orders.filter(o => o.status === 'kitchen_ready').length})
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-stone-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
            {t('Monitor de cocina sincronizado')}
          </div>
        </div>

        {/* Live Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => {
            const isPending = order.status === 'pending';
            const isInProgress = order.status === 'kitchen_in_progress';
            const isReady = order.status === 'kitchen_ready';
            const isDelivered = order.status === 'delivered';

            return (
              <div 
                key={order.id} 
                className={`rounded-3xl p-5 border shadow-md transition-all flex flex-col justify-between ${
                  isPending ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30' :
                  isInProgress ? 'bg-blue-50/90 border-blue-300' :
                  isReady ? 'bg-green-50/90 border-green-300' :
                  'bg-white border-stone-200 opacity-80'
                }`}
              >
                <div className="space-y-4">
                  {/* Table & Header */}
                  <div className="flex justify-between items-start border-b border-stone-200/80 pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-500">
                        {order.comandaId ? `${t('Comanda')} #${order.comandaId}` : t('Pedido Directo')}
                      </span>
                      <h3 className="text-xl font-serif font-bold text-stone-900">
                        {order.tableNumber}
                      </h3>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                      isPending ? 'bg-amber-500 text-stone-950' :
                      isInProgress ? 'bg-blue-600 text-white' :
                      isReady ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {isPending && <Clock size={13} />}
                      {isInProgress && <Flame size={13} />}
                      {isReady && <CheckCircle2 size={13} />}
                      {isPending ? t('Pendiente') : isInProgress ? t('En Marcha') : isReady ? t('Listo') : t('Servido')}
                    </span>
                  </div>

                  {/* Items List with Quantities */}
                  <div className="space-y-2 bg-white/80 p-3 rounded-2xl border border-stone-200/60">
                    <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      {t('Platos & Raciones a preparar:')}
                    </div>

                    {order.orderItems && order.orderItems.length > 0 ? (
                      <ul className="space-y-1.5 text-xs font-semibold text-stone-800">
                        {order.orderItems.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center py-1 border-b border-stone-100 last:border-0">
                            <span className="text-stone-900 font-bold">{item.name}</span>
                            <span className="bg-stone-900 text-amber-300 px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                              x{item.quantity} {item.quantity > 1 ? t('raciones') : t('ración')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="space-y-1.5 text-xs font-semibold text-stone-800">
                        {order.items.map((itemStr, idx) => (
                          <li key={idx} className="flex justify-between items-center py-1 border-b border-stone-100 last:border-0">
                            <span>{itemStr}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 mt-4 border-t border-stone-200/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-stone-400">
                    {new Date(order.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex gap-2">
                    {isPending && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'kitchen_in_progress')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Flame size={13} /> {t('Preparar')}
                      </button>
                    )}

                    {(isPending || isInProgress) && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'kitchen_ready')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 size={13} /> {t('Marcar Listo')}
                      </button>
                    )}

                    {isReady && (
                      <span className="text-xs text-green-700 font-bold flex items-center gap-1 bg-green-100 px-3 py-1 rounded-xl">
                        ✓ {t('Avisado a Garzón')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-3xl text-center border border-dashed border-stone-300 space-y-3">
              <Utensils className="mx-auto text-stone-300" size={48} />
              <h4 className="text-lg font-serif font-bold text-stone-700">
                {t('No hay comandas registradas en este estado')}
              </h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                {t('Los pedidos enviados por los dependientes aparecerán automáticamente aquí en tiempo real.')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Generate Kitchen Report */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-stone-200 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <FileCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  {t('Enviar Informe Diario de Cocina')}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('Resumen de comandas y raciones elaboradas durante la jornada laboral.')}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400">{t('Total Comandas:')}</span>
                  <div className="text-xl font-serif font-bold text-stone-900">{orders.length}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400">{t('Responsable:')}</span>
                  <div className="text-sm font-bold text-dark-green">{kitchenInfo.name || 'Jefe de Cocina'}</div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 leading-relaxed text-xs">
                <strong>{t('Importante:')}</strong> {t('Al enviar este informe, se registrará formalmente en el sistema para que el Gerente de Restaurante realice el cruce comparativo con los informes de dependientes en el Cierre de Caja.')}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 font-bold text-xs"
              >
                {t('Cancelar')}
              </button>
              <button
                onClick={handleGenerateKitchenReport}
                className="px-5 py-2.5 rounded-xl bg-dark-green hover:bg-stone-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Send size={15} /> {t('Confirmar & Enviar a Gerente')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
