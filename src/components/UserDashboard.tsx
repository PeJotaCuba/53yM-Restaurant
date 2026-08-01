import React, { useState, useEffect } from 'react';
import { Reservation, AppData, Order, OrderItem, AppNotification } from '../types';
import { Clock, CheckCircle2, XCircle, Edit2, Calendar, User, Phone, X, Save, AlertTriangle, MessageCircle, Utensils, Plus, Trash2, Send, ShoppingBag, ShieldAlert, Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceId } from '../hooks/useDeviceId';
import { useLanguage } from '../context/LanguageContext';
import { isDeviceRegistered } from '../utils/deviceUtils';
import { jsPDF } from 'jspdf';

interface UserDashboardProps {
  reservations: Reservation[];
  data?: AppData;
  updateData?: (data: Partial<AppData>) => void;
  onUpdateReservation?: (id: string, newDetails: Partial<Reservation>) => void;
  onCancelReservation?: (id: string) => void;
  onOpenLogin?: () => void;
}


function formatDateFriendly(dateStr: string) {
  if (!dateStr) return '';
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} de ${months[monthIndex]} del ${year}`;
    }
  }
  return dateStr;
}

function formatTime12h(timeStr: string) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursFormatted = hours.toString().padStart(2, '0');
    return `${hoursFormatted}:${minutes} ${ampm}`;
  }
  return timeStr;
}

export function UserDashboard({ reservations, data, updateData, onUpdateReservation, onCancelReservation, onOpenLogin }: UserDashboardProps) {
  const { t } = useLanguage();
  const [now, setNow] = useState(new Date());
  const deviceId = useDeviceId();

  const [activeTab, setActiveTab] = useState<'reservations' | 'order'>('reservations');

  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [cancellingResId, setCancellingResId] = useState<string | null>(null);

  // Client direct table order state
  const [clientTable, setClientTable] = useState('');
  const [showMesaSelection, setShowMesaSelection] = useState(true);
  const [isReviewingOrder, setIsReviewingOrder] = useState(false);
  const [showClosedComandas, setShowClosedComandas] = useState(false);
  const [clientName, setClientName] = useState('');
  const [selectedDishName, setSelectedDishName] = useState(data?.menuItems[0]?.name || '');
  const [dishRations, setDishRations] = useState<number>(1);
  const [cartItems, setCartItems] = useState<{ dishName: string; quantity: number; priceCUP: number }[]>([]);

  // Real-time reservation confirmation notification states
  const [confirmedReservationAlert, setConfirmedReservationAlert] = useState<any | null>(null);

  useEffect(() => {
    if (data?.menuItems && data.menuItems.length > 0 && !selectedDishName) {
      setSelectedDishName(data.menuItems[0].name);
    }
  }, [data?.menuItems]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeReservations = reservations.filter(r => r.status !== 'cancelled').sort((a, b) => b.createdAt - a.createdAt);

  const prevReservationsRef = React.useRef<any[]>([]);

  useEffect(() => {
    const currentReservations = activeReservations || [];
    const prevReservations = prevReservationsRef.current;

    if (prevReservations.length > 0) {
      currentReservations.forEach(current => {
        const prev = prevReservations.find(p => p.id === current.id);
        if (prev && prev.status === 'pending' && (current.status === 'confirmed' || current.status === 'paid')) {
          setConfirmedReservationAlert(current);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Reserva Confirmada 🎉", {
              body: `Tu reserva para el ${formatDateFriendly(current.date)} ha sido confirmada.`
            });
          }
        }
      });
    }

    prevReservationsRef.current = currentReservations;
  }, [activeReservations]);

  const usdCUP = data?.exchangeRate?.usdCUP || 320;
  const eurCUP = data?.exchangeRate?.eurCUP || 350;

  const clientReadyOrders = (data?.orders || []).filter(o => o.status === 'kitchen_ready' && o.tableNumber === clientTable);

  // Add item to client cart
  const handleAddToCart = () => {
    const foundDish = data?.menuItems.find(m => m.name === selectedDishName);
    const priceCUP = foundDish ? foundDish.priceCUP : 100;

    const existingIndex = cartItems.findIndex(i => i.dishName === selectedDishName);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += dishRations;
      setCartItems(updated);
    } else {
      setCartItems(prev => [...prev, { dishName: selectedDishName, quantity: dishRations, priceCUP }]);
    }
    setDishRations(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.priceCUP * item.quantity), 0);
  };

  // Submit complete order to waiter
  const handleSubmitCartOrder = () => {
    if (data?.isShiftActive === false) {
      alert(t('⚠️ La jornada actual no ha sido iniciada por el Administrador. Solicite al Administrador que inicie la jornada para enviar pedidos.'));
      return;
    }

    if (cartItems.length === 0) {
      alert(t('Agrega al menos un plato a tu pedido antes de enviar.'));
      return;
    }

    const orderItemsList: OrderItem[] = cartItems.map(c => ({
      name: c.dishName,
      quantity: c.quantity,
      priceCUP: c.priceCUP
    }));

    const rawItemsList = cartItems.map(c => `${c.quantity}x ${c.dishName}`);

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      tableNumber: clientTable,
      items: rawItemsList,
      orderItems: orderItemsList,
      status: 'client_pending',
      timestamp: Date.now()
    };

    if (updateData && data) {
      const updatedOrders = [...(data.orders || []), newOrder];
      
      const log = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        dateStr: new Date().toLocaleDateString('es-ES'),
        role: 'Cliente' as const,
        userOrDevice: clientName.trim() || 'Cliente',
        action: 'Pedido Solicitado en Mesa',
        details: `Cliente solicitó pedido de ${cartItems.length} plato(s) en ${clientTable} (Enviado a Dependiente).`
      };

      updateData({
        orders: updatedOrders,
        auditLogs: [log, ...(data.auditLogs || [])]
      });
    }

    setCartItems([]);
    alert(t('¡Tu pedido ha sido enviado al dependiente de tu mesa! El dependiente revisará tu pedido y lo mandará a cocina.'));
  };

  const getCountdown = (date: string, time: string) => {
    if (!date || !time) return null;
    
    const dateParts = date.split('-');
    const timeParts = time.split(':');
    if (dateParts.length !== 3 || timeParts.length < 2) return null;
    
    const target = new Date(
      parseInt(dateParts[0]), 
      parseInt(dateParts[1]) - 1, 
      parseInt(dateParts[2]),
      parseInt(timeParts[0]),
      parseInt(timeParts[1]),
      0
    );
    
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, mins, secs };
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRes && onUpdateReservation) {
      onUpdateReservation(editingRes.id, {
        date: editingRes.date,
        time: editingRes.time,
        guests: editingRes.guests,
        occasion: editingRes.occasion,
        name: editingRes.name,
        phone: editingRes.phone,
        email: editingRes.email,
        dishReference: editingRes.dishReference
      });
      setEditingRes(null);
      alert('¡Tus cambios de reservación han sido guardados!');
    }
  };

  const handleConfirmCancel = (id: string) => {
    if (onCancelReservation) {
      onCancelReservation(id);
      setCancellingResId(null);
      alert('La reservación ha sido cancelada correctamente.');
    }
  };

  const isShiftActive = data?.isShiftActive !== false;

  // Generate PDF receipt for a closed comanda (Client Side)
  const generateComandaPDF = (com: any) => {
    try {
      const doc = new jsPDF();
      const totalCUP = com.totalAmountCUP || 0;
      const exRates = com.exchangeRateUsed || { usdCUP, eurCUP };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('53&M RESTAURANT', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('COMPROBANTE DE CONSUMO', 105, 28, { align: 'center' });
      doc.text('----------------------------------------------------', 105, 34, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Comanda ID: #${com.id}`, 20, 45);
      doc.text(`Mesa: ${com.tableNumber}`, 20, 52);
      doc.text(`Cliente: ${com.customerName || 'Cliente'}`, 20, 59);
      doc.text(`Fecha y Hora: ${new Date(com.closedAt || Date.now()).toLocaleDateString('es-ES')} ${new Date(com.closedAt || Date.now()).toLocaleTimeString('es-ES')}`, 20, 66);

      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE CONSUMO:', 20, 78);
      doc.setFont('helvetica', 'normal');

      let y = 86;
      if (com.orders) {
        com.orders.forEach((ord: any) => {
          if (ord.orderItems) {
            ord.orderItems.forEach((it: any) => {
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
      doc.text('TOTAL:', 20, y);
      doc.text(`$${totalCUP.toLocaleString()} CUP`, 180, y, { align: 'right' });

      y += 8;
      doc.text('PAGO REALIZADO:', 20, y);
      doc.text(`${com.paymentSummaryStr || `$${totalCUP} CUP`}`, 180, y, { align: 'right' });

      y += 18;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('¡Gracias por su visita a 53&M Restaurant!', 105, y, { align: 'center' });

      doc.save(`Recibo_53yM_Mesa_${com.tableNumber}_${com.id.slice(-5)}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Error al generar el PDF. Por favor intente de nuevo.');
    }
  };

  const clientClosedComandas = (data?.comandas || []).filter(c => c.tableNumber === clientTable && c.status === 'closed').sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  const deviceRegistered = isDeviceRegistered(deviceId, data);

  return (
    <div className="pt-28 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-stone-200/60 pb-6">
        <div>
          <h2 className="text-4xl font-serif text-dark-green mb-2">{t('Mi perfil')}</h2>
          <p className="text-stone-500 text-sm">{t('Gestiona tus reservas o realiza un pedido directamente en el restaurante')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* WhatsApp contact */}
          <a
            href="https://wa.me/5354413935?text=Hola%2053%26M%2C%20quisiera%20contactar%20con%20el%20administrador%20sobre%20mis%20reservas."
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-[#20ba5a] transition-all shadow-md"
          >
            <MessageCircle size={15} /> <span>{t('Contactar por WhatsApp')}</span>
          </a>

          {/* Discrete Device ID */}
          <span className="text-xs text-stone-500 font-mono bg-stone-100 px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-xs" title="ID de este dispositivo">
            ID: {deviceId || 'DVC-00000'}
          </span>

          {/* Approved Device Staff Entrance */}
          {deviceRegistered && onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="bg-gold/15 hover:bg-gold text-gold hover:text-stone-900 border border-gold/40 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Acceso para el personal autorizado"
            >
              <ShieldAlert size={14} />
              <span>{t('Acceso de Personal')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Client Reservation Confirmed Alert */}
      {confirmedReservationAlert && (
        <div className="bg-green-900 text-white rounded-3xl p-6 mb-8 shadow-2xl border-2 border-green-400/85 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in relative">
          <button 
            onClick={() => setConfirmedReservationAlert(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white font-bold p-1"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-800/80 rounded-2xl text-3xl shrink-0 animate-bounce border border-green-500/40">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-green-400 text-green-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Reservación Confirmada
                </span>
                <span className="text-[11px] text-green-300 font-mono">En tiempo real</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-white">
                ¡Tu reservación ha sido confirmada!
              </h4>
              <p className="text-xs text-green-100 mt-1">
                El administrador ha confirmado tu reserva a nombre de <strong>{confirmedReservationAlert.name || confirmedReservationAlert.customerName || 'Cliente'}</strong> para el día <strong>{formatDateFriendly(confirmedReservationAlert.date)}</strong> a las <strong>{formatTime12h(confirmedReservationAlert.time)}</strong> ({confirmedReservationAlert.guests} personas). ¡Te esperamos!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Client Ready Notification Alert (Push-style message notification) */}
      {clientReadyOrders.length > 0 && (
        <div className="bg-emerald-900 text-white rounded-3xl p-6 mb-8 shadow-2xl border-2 border-emerald-400/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-800/80 rounded-2xl text-3xl shrink-0 animate-pulse border border-emerald-500/40">
              🔔
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-400 text-emerald-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Notificación en Pantalla
                </span>
                <span className="text-[11px] text-emerald-300 font-mono">Hace un instante</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-white">
                ¡Tu Pedido está listo en cocina!
              </h4>
              <p className="text-xs text-emerald-100 mt-1">
                La cocina ha terminado la preparación de tus platos para la <strong>{clientTable}</strong>. El dependiente de tu mesa se los servirá en breve.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CLOSED COMANDAS / RECEIPTS SECTION */}
      {!showMesaSelection && clientClosedComandas.length > 0 && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-800">Tienes comprobantes de pago listos</h4>
              <p className="text-[10px] text-stone-500">Puedes descargar tu recibo de consumos anteriores.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowClosedComandas(!showClosedComandas)}
            className="text-xs font-bold text-dark-green hover:underline"
          >
            {showClosedComandas ? 'Ocultar' : 'Ver Recibos'}
          </button>
        </div>
      )}

      {showClosedComandas && !showMesaSelection && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8 space-y-3"
        >
          {clientClosedComandas.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-stone-900">Comanda #{c.id.slice(-6)} — {clientTable}</div>
                <div className="text-[10px] text-stone-500">{new Date(c.closedAt || 0).toLocaleDateString()} {new Date(c.closedAt || 0).toLocaleTimeString()}</div>
              </div>
              <button 
                onClick={() => generateComandaPDF(c)}
                className="bg-dark-green text-white px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 hover:bg-stone-900 shadow-sm"
              >
                <Download size={14} /> Descargar Recibo PDF
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Navigation Tabs for Client */}
      <div className="flex gap-3 mb-8 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'reservations' ? 'bg-dark-green text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar size={16} /> {t('Mis Reservas')} ({activeReservations.length})
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'order' ? 'bg-dark-green text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Utensils size={16} /> {t('Hacer Pedido en Restaurante')}
        </button>
      </div>

      {/* TAB 1: MIS RESERVAS */}
      {activeTab === 'reservations' && (
        <>
          {activeReservations.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-stone-100">
              <Clock className="w-16 h-16 text-stone-200 mx-auto mb-4" />
              <h3 className="text-xl font-serif text-stone-700 mb-2">{t('No tienes reservas activas')}</h3>
              <p className="text-stone-400 mb-6">{t('¿Listo para vivir una experiencia diferente?')}</p>
              <a
                href="https://wa.me/5354413935?text=Hola%2053%26M%2C%20quisiera%20consultar%20disponibilidad%20para%20reservar%20una%20mesa."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-2xl text-xs font-bold hover:bg-[#20ba5a] transition-colors shadow-sm"
              >
                <MessageCircle size={16} /> {t('Contactar Administrador por WhatsApp')}
              </a>
            </div>
          ) : (
        <div className="space-y-6">
          {activeReservations.map((res, idx) => {
            const cd = getCountdown(res.date, res.time);
            const waMsg = `Hola 53&M, quisiera realizar una consulta al administrador referente a mi reserva a nombre de ${res.name} para el ${res.date} a las ${res.time}.`;
            const waUrl = `https://wa.me/5354413935?text=${encodeURIComponent(waMsg)}`;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={res.id || `res-${idx}`} 
                className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-stone-100 overflow-hidden relative"
              >
                {/* Status Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  {res.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center"><Clock size={12} className="mr-1"/> {t('Pendiente')}</span>}
                  {res.status === 'cancellation_pending' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center"><AlertTriangle size={12} className="mr-1"/> {t('Cancelación Pendiente')}</span>}
                  {(res.status === 'paid' || res.status === 'confirmed') && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center"><CheckCircle2 size={12} className="mr-1"/> {t('Confirmada')}</span>}
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  {/* Info Column */}
                  <div className="flex-1">
                    <div className="space-y-1 mb-6">
                      <div className="text-sm font-bold text-stone-700">
                        {t('Fecha')}: <span className="text-base text-dark-green font-semibold">{formatDateFriendly(res.date)}</span>
                      </div>
                      <div className="text-sm font-bold text-stone-700">
                        {t('Hora')}: <span className="text-base text-dark-green font-semibold">{formatTime12h(res.time)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 text-sm pt-2 border-t border-stone-100 mb-6">
                      <div>
                        <span className="block text-stone-400 mb-1">{t('Personas')}</span>
                        <span className="font-medium text-stone-700">{res.guests} comensales</span>
                      </div>
                      <div>
                        <span className="block text-stone-400 mb-1">{t('Ocasión')}</span>
                        <span className="font-medium text-stone-700">{t(res.occasion)}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="block text-stone-400 mb-1">A nombre de</span>
                        <span className="font-medium text-stone-700">{res.name} ({res.phone})</span>
                      </div>
                      {res.dishReference && (
                        <div className="col-span-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-xs">
                          <span className="text-stone-400 font-medium block">Plato / Nota seleccionada:</span>
                          <span className="text-dark-green font-bold">{res.dishReference}</span>
                        </div>
                      )}
                    </div>

                    {/* Customer Action Buttons: Edit, WhatsApp Admin & Cancel */}
                    <div className="flex flex-wrap gap-2.5 pt-3 border-t border-stone-100">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <MessageCircle size={14} /> Contactar WhatsApp
                      </a>
                      {res.status !== 'cancellation_pending' && (
                        <>
                          <button
                            onClick={() => setEditingRes({ ...res })}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Edit2 size={14} /> {t('Cambiar Fecha / Detalles')}
                          </button>
                          <button
                            onClick={() => setCancellingResId(res.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-red-200"
                          >
                            <XCircle size={14} /> {t('Cancelar Reserva')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="flex-1 bg-stone-50 rounded-2xl p-6 border border-stone-100 flex flex-col justify-center">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      {res.status === 'pending' ? (
                        <div className="mb-6">
                          <p className="text-stone-600 text-sm">Tu reserva ha sido recibida y está pendiente de confirmación por nuestro equipo.</p>
                        </div>
                      ) : (
                        <>
                          {cd ? (
                            <>
                              <p className="text-sm text-stone-500 mb-4 uppercase tracking-wide font-medium">Te esperamos en</p>
                              <div className="flex gap-4">
                                <div className="text-center w-12">
                                  <div className="text-3xl font-serif text-gold tabular-nums">{cd.days}</div>
                                  <div className="text-[10px] text-stone-400 uppercase font-bold">Días</div>
                                </div>
                                <div className="text-center w-12">
                                  <div className="text-3xl font-serif text-gold tabular-nums">{cd.hours.toString().padStart(2, '0')}</div>
                                  <div className="text-[10px] text-stone-400 uppercase font-bold">Hrs</div>
                                </div>
                                <div className="text-center w-12">
                                  <div className="text-3xl font-serif text-gold tabular-nums">{cd.mins.toString().padStart(2, '0')}</div>
                                  <div className="text-[10px] text-stone-400 uppercase font-bold">Min</div>
                                </div>
                                <div className="text-center w-12">
                                  <div className="text-3xl font-serif text-gold tabular-nums">{cd.secs.toString().padStart(2, '0')}</div>
                                  <div className="text-[10px] text-stone-400 uppercase font-bold">Sec</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-xl font-serif text-dark-green">¡Es hora! Te estamos esperando.</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* TAB 2: HACER PEDIDO EN RESTAURANTE */}
      {activeTab === 'order' && (
        <div className="space-y-6">
          {!isShiftActive && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
              <div className="text-xs">
                <span className="font-bold block">Jornada Inactiva</span>
                El Administrador no ha iniciado la jornada de operaciones. Los pedidos solicitados estarán deshabilitados temporalmente.
              </div>
            </div>
          )}

          {/* MESA SELECTION STEP */}
          {showMesaSelection && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 text-center"
            >
              <div className="mb-4">
                <Utensils className="w-12 h-12 text-dark-green mx-auto mb-3" />
                <h3 className="text-2xl font-serif font-bold text-dark-green">Selecciona tu Mesa</h3>
                <p className="text-sm text-stone-500">Indícanos dónde estás sentado para recibir tu pedido.</p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-xl mx-auto">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setClientTable(`Mesa ${num}`);
                      setShowMesaSelection(false);
                    }}
                    className="aspect-square rounded-2xl border-2 border-stone-100 bg-stone-50 flex items-center justify-center text-xl font-bold text-stone-600 hover:border-dark-green hover:bg-emerald-50 hover:text-dark-green transition-all shadow-xs"
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="pt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
                {['Barra 1', 'Terraza A'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setClientTable(opt);
                      setShowMesaSelection(false);
                    }}
                    className="py-3 px-4 rounded-xl border-2 border-stone-100 bg-stone-50 text-xs font-bold text-stone-600 hover:border-dark-green hover:bg-emerald-50 hover:text-dark-green transition-all shadow-xs"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ACTIVE CLIENT ORDERS FOR THIS TABLE */}
          {!showMesaSelection && !isReviewingOrder && (() => {
            const tableOrders = (data?.orders || []).filter(o => o.tableNumber === clientTable && o.status !== 'delivered');
            if (tableOrders.length === 0) return null;

            return (
              <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-emerald-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="text-gold" size={20} />
                    <h3 className="font-serif font-bold text-lg text-white">
                      Pedidos en Marcha ({tableOrders.length})
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowMesaSelection(true)}
                    className="text-[10px] bg-emerald-900 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700 hover:bg-emerald-800"
                  >
                    Cambiar {clientTable}
                  </button>
                </div>

                <div className="space-y-3">
                  {tableOrders.map(ord => {
                    const totalCUP = ord.orderItems?.reduce((acc, i) => acc + (i.priceCUP * i.quantity), 0) || 0;
                    return (
                      <div key={ord.id} className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700/60 space-y-3">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-bold text-gold">Pedido #{ord.id.split('-')[1] || ord.id}</span>
                            <span className="text-emerald-300 ml-2 font-mono text-[10px]">
                              {new Date(ord.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            ord.status === 'kitchen_ready' ? 'bg-emerald-400 text-emerald-950 animate-pulse font-black' :
                            ord.status === 'kitchen_in_progress' ? 'bg-amber-400 text-amber-950' :
                            'bg-stone-700 text-stone-200'
                          }`}>
                            {ord.status === 'kitchen_ready' ? '🔔 ¡LISTO PARA SERVIR!' :
                             ord.status === 'kitchen_in_progress' ? '🍳 En Preparación' : '⏳ Pendiente'}
                          </span>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1 text-xs">
                          {ord.orderItems?.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-emerald-100">
                              <span><strong className="text-gold">{it.quantity}x</strong> {it.name}</span>
                              <span className="font-mono text-emerald-300">${(it.priceCUP * it.quantity).toLocaleString()} CUP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ACTIVE CLIENT ACCOUNT (OPEN COMANDA) */}
          {!showMesaSelection && !isReviewingOrder && (() => {
            const openComanda = (data?.comandas || []).find(c => c.tableNumber === clientTable && c.status === 'open');
            if (!openComanda) return null;

            // Get live status of orders in the comanda from data.orders
            const comandaOrders = (openComanda.orders || []).map(o => {
              const liveO = (data?.orders || []).find(ord => ord.id === o.id);
              return liveO ? { ...o, status: liveO.status } : o;
            });

            const totalCUP = comandaOrders.reduce((sum, ord) => {
              const ordTotal = ord.orderItems?.reduce((acc, i) => acc + (i.priceCUP * i.quantity), 0) || 0;
              return sum + ordTotal;
            }, 0);

            const totalUSD = totalCUP / usdCUP;
            const totalEUR = totalCUP / eurCUP;

            return (
              <div className="bg-stone-50 border border-stone-200 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="text-dark-green" size={20} />
                    <h3 className="font-serif font-bold text-lg text-stone-900">
                      Consumo Activo en {clientTable}
                    </h3>
                  </div>
                  {openComanda.paymentRequested ? (
                    <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase animate-pulse">
                      ⏳ Cuenta Confirmada / Solicitando Cobro
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      ● Cuenta Abierta
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {comandaOrders.map(ord => {
                    return (
                      <div key={ord.id} className="bg-white p-3.5 rounded-2xl border border-stone-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-stone-700">Pedido #{ord.id.split('-')[1] || ord.id}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            ord.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            ord.status === 'kitchen_ready' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                            ord.status === 'kitchen_in_progress' ? 'bg-amber-100 text-amber-800' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {ord.status === 'delivered' ? '✓ Servido en Mesa' :
                             ord.status === 'kitchen_ready' ? '🔔 ¡Listo para Servir!' :
                             ord.status === 'kitchen_in_progress' ? '🍳 En Preparación' : '⏳ Pendiente'}
                          </span>
                        </div>
                        <div className="space-y-1 pl-1 text-xs">
                          {ord.orderItems?.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-stone-600">
                              <span><strong>{it.quantity}x</strong> {it.name}</span>
                              <span className="font-mono">${(it.priceCUP * it.quantity).toLocaleString()} CUP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-stone-200 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-stone-400 font-bold">Total Parcial</span>
                    <div className="text-xl font-serif font-bold text-dark-green">
                      ${totalCUP.toLocaleString()} CUP
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      ${totalUSD.toFixed(2)} USD • €{totalEUR.toFixed(2)} EUR
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 border border-stone-300"
                    >
                      <Plus size={14} /> Pedir Otro Plato
                    </button>

                    {!openComanda.paymentRequested && (
                      <button
                        onClick={() => {
                          if (!confirm('¿Deseas confirmar tu cuenta y solicitar el cobro al dependiente?')) return;
                          
                          // Mark as requested in comanda
                          const updatedComandas = (data?.comandas || []).map(c => {
                            if (c.id === openComanda.id) {
                              return { ...c, paymentRequested: true };
                            }
                            return c;
                          });

                          // Create log
                          const log = {
                            id: `LOG-${Date.now()}`,
                            timestamp: Date.now(),
                            timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                            dateStr: new Date().toLocaleDateString('es-ES'),
                            role: 'Cliente' as const,
                            userOrDevice: clientName.trim() || 'Cliente',
                            action: 'Confirmó Cuenta & Solicitó Cobro',
                            details: `Cliente de ${clientTable} confirmó su cuenta de $${totalCUP.toLocaleString()} CUP y solicitó el pago.`
                          };

                          // Add a notification for the waiter
                          const notif: AppNotification = {
                            id: `NOTIF-PAY-${Date.now()}`,
                            timestamp: Date.now(),
                            orderId: openComanda.id,
                            tableNumber: clientTable,
                            targetRole: 'dependent',
                            title: '💵 ¡Solicitud de Cuenta!',
                            message: `Mesa ${clientTable} solicita la cuenta. Total: $${totalCUP.toLocaleString()} CUP.`
                          };

                          if (updateData) {
                            updateData({
                              comandas: updatedComandas,
                              notifications: [notif, ...(data?.notifications || [])],
                              auditLogs: [log, ...(data?.auditLogs || [])]
                            });
                          }
                          alert('✓ Solicitud de pago enviada. El dependiente acudirá a tu mesa con el comprobante.');
                        }}
                        className="bg-emerald-700 hover:bg-emerald-850 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 shadow-md"
                      >
                        <Check size={14} /> Confirmar Cuenta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DISH SELECTION UI */}
          {!showMesaSelection && !isReviewingOrder && (
            <div id="menu-section" className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-dark-green">Conformar Pedido</h3>
                  <p className="text-xs text-stone-500">Agrega platos de la carta a tu pedido en {clientTable}.</p>
                </div>
                <button 
                  onClick={() => setShowMesaSelection(true)}
                  className="bg-stone-100 text-stone-600 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-stone-200"
                >
                  Cambiar Mesa
                </button>
              </div>

              {/* Select Dish Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                {(data?.menuItems || []).map((menuItem) => {
                  const isSelected = selectedDishName === menuItem.name;
                  const itemInCart = cartItems.find(i => i.dishName === menuItem.name);
                  
                  return (
                    <div
                      key={menuItem.id}
                      onClick={() => {
                        setSelectedDishName(menuItem.name);
                        if (!itemInCart) setDishRations(1);
                        else setDishRations(itemInCart.quantity);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                        isSelected
                          ? 'border-dark-green bg-emerald-50/60 ring-2 ring-dark-green/20'
                          : 'border-stone-100 bg-stone-50/40 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-bold text-stone-900">{menuItem.name}</div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                            ${menuItem.priceCUP.toLocaleString()} CUP
                          </div>
                        </div>
                        {itemInCart && (
                          <span className="bg-dark-green text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {itemInCart.quantity}
                          </span>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-emerald-200/50" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1">
                            <button type="button" onClick={() => setDishRations(Math.max(1, dishRations - 1))} className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors">-</button>
                            <span className="w-6 text-xs font-bold text-center">{dishRations}</span>
                            <button type="button" onClick={() => setDishRations(dishRations + 1)} className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors">+</button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={!isShiftActive}
                            className="flex-1 bg-dark-green text-white hover:bg-emerald-900 disabled:opacity-50 py-2 rounded-lg text-[11px] font-bold shadow-sm transition-all text-center"
                          >
                            {itemInCart ? 'Actualizar' : 'Agregar'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Review Bar */}
              {cartItems.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-xs text-stone-500">
                      <span className="font-bold text-dark-green">{cartItems.length} platos</span> seleccionados
                    </div>
                    <div className="text-lg font-serif font-bold text-dark-green">
                      Total: ${calculateCartTotal().toLocaleString()} CUP
                    </div>
                  </div>
                  <button
                    onClick={() => setIsReviewingOrder(true)}
                    className="w-full bg-gold text-dark-green hover:bg-amber-300 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-wider"
                  >
                    <ShoppingBag size={18} /> Revisar Pedido y Enviar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ORDER REVIEW STEP */}
          {isReviewingOrder && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 md:p-8 rounded-3xl border-2 border-gold shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-dark-green">Revisa tu Pedido</h3>
                  <p className="text-xs text-stone-500">Verifica los platos y cantidades antes de enviarlos a la cocina.</p>
                </div>
                <button onClick={() => setIsReviewingOrder(false)} className="text-stone-400 hover:text-stone-900 p-2">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 divide-y divide-stone-200">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 px-2">
                  <span>Plato</span>
                  <span>Subtotal</span>
                </div>
                {cartItems.map((item, idx) => (
                  <div key={idx} className="py-3 flex justify-between items-center px-2">
                    <div>
                      <div className="text-sm font-bold text-stone-900">
                        <span className="text-dark-green mr-2">{item.quantity}x</span> {item.dishName}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5 font-mono">
                        ${item.priceCUP.toLocaleString()} CUP por ración
                      </div>
                    </div>
                    <div className="text-sm font-bold text-stone-800 font-mono">
                      ${(item.priceCUP * item.quantity).toLocaleString()} CUP
                    </div>
                  </div>
                ))}
                <div className="pt-4 mt-2 flex justify-between items-center px-2">
                  <span className="font-serif text-lg font-bold text-stone-900">Total a Pagar</span>
                  <div className="text-right">
                    <div className="text-2xl font-serif font-bold text-dark-green">
                      ${calculateCartTotal().toLocaleString()} CUP
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      ~ ${(calculateCartTotal() / usdCUP).toFixed(2)} USD • €{(calculateCartTotal() / eurCUP).toFixed(2)} EUR
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleSubmitCartOrder();
                    setIsReviewingOrder(false);
                    setShowMesaSelection(true); // Reset for next order
                  }}
                  className="w-full bg-dark-green text-white hover:bg-stone-900 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-wider"
                >
                  <Send size={18} /> Confirmar y Enviar a Cocina
                </button>
                <button
                  onClick={() => setIsReviewingOrder(false)}
                  className="w-full bg-stone-100 text-stone-600 hover:bg-stone-200 py-3 rounded-2xl text-xs font-bold transition-all"
                >
                  Seguir Agregando Platos
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* EDIT RESERVATION MODAL */}
      <AnimatePresence>
        {editingRes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setEditingRes(null)}
                className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 p-1"
              >
                <X size={20} />
              </button>

              <h3 className="font-serif text-2xl text-dark-green mb-1">Modificar Reservación</h3>
              <p className="text-xs text-stone-500 mb-6">Cambia la fecha, hora u otros detalles de tu experiencia.</p>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Nueva Fecha</label>
                    <input
                      type="date"
                      required
                      value={editingRes.date || ''}
                      onChange={e => setEditingRes({ ...editingRes, date: e.target.value })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Nueva Hora</label>
                    <input
                      type="time"
                      required
                      value={editingRes.time || ''}
                      onChange={e => setEditingRes({ ...editingRes, time: e.target.value })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Personas / Comensales</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={editingRes.guests || 1}
                      onChange={e => setEditingRes({ ...editingRes, guests: Number(e.target.value) })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Ocasión</label>
                    <select
                      value={editingRes.occasion || 'Cena casual'}
                      onChange={e => setEditingRes({ ...editingRes, occasion: e.target.value })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    >
                      <option value="Cena casual">Cena casual</option>
                      <option value="Cumpleaños">Cumpleaños</option>
                      <option value="Aniversario">Aniversario</option>
                      <option value="Negocios">Negocios</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">A Nombre de</label>
                  <input
                    type="text"
                    required
                    value={editingRes.name || ''}
                    onChange={e => setEditingRes({ ...editingRes, name: e.target.value })}
                    className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Teléfono Móvil</label>
                    <input
                      type="text"
                      required
                      value={editingRes.phone || ''}
                      onChange={e => setEditingRes({ ...editingRes, phone: e.target.value })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editingRes.email || ''}
                      onChange={e => setEditingRes({ ...editingRes, email: e.target.value })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRes(null)}
                    className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-dark-green text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <Save size={16} /> Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CANCEL MODAL */}
      <AnimatePresence>
        {cancellingResId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-serif text-2xl text-stone-900 mb-2">¿Cancelar Reservación?</h3>
              <p className="text-sm text-stone-500 mb-6">
                Esta acción cancelará tu reserva activa en 53&M. Puedes realizar una nueva reserva cuando desees.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setCancellingResId(null)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50"
                >
                  Mantener Reserva
                </button>
                <button
                  onClick={() => handleConfirmCancel(cancellingResId)}
                  className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-md"
                >
                  Sí, Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
