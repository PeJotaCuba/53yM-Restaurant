import React, { useState, useEffect } from 'react';
import { Reservation, AppData, Order, OrderItem, AppNotification } from '../types';
import { Clock, CheckCircle2, XCircle, Edit2, Calendar, User, Phone, X, Save, AlertTriangle, Utensils, Plus, Trash2, Send, ShoppingBag, ShieldAlert, Download, Check } from 'lucide-react';
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
  onOrderWorkspace?: () => void;
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

export function UserDashboard({ reservations, data, updateData, onUpdateReservation, onCancelReservation, onOpenLogin, onOrderWorkspace }: UserDashboardProps) {
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

      {/* SECTION 1: MIS RESERVAS */}
      <div className="mb-8">
        <h3 className="text-2xl font-serif text-dark-green mb-6 text-center">{t('Mis Reservas')}</h3>
        {activeReservations.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-stone-100">
            <Clock className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-stone-700 mb-2">{t('No tienes reservas activas')}</h3>
            <p className="text-stone-400 font-medium">{t('¿Listo para vivir una experiencia diferente?')}</p>
          </div>
        ) : (
        <div className="space-y-6">
          {activeReservations.map((res, idx) => {
            const cd = getCountdown(res.date, res.time);
            
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

                    {/* Customer Action Buttons: Edit & Cancel */}
                    <div className="flex flex-wrap gap-2.5 pt-3 border-t border-stone-100">
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

        {/* PEDIDOS EN EL RESTAURANTE BUTTON */}
        <div className="mt-12 max-w-md mx-auto text-center">
          <button
            onClick={onOrderWorkspace}
            className="w-full bg-dark-green hover:bg-stone-900 text-white font-serif text-lg py-5 px-8 rounded-3xl transition-all duration-300 flex items-center justify-center gap-3 border border-stone-200 shadow-md active:scale-95 cursor-pointer"
          >
            <Utensils className="text-gold" size={22} /> {t('Pedidos en el restaurante')}
          </button>
        </div>
      </div>

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
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 p-2"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-2xl font-serif text-dark-green mb-6">{t('Modificar Reserva')}</h3>
              
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{t('Fecha')}</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={editingRes.date}
                      onChange={e => setEditingRes({ ...editingRes, date: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:border-dark-green focus:ring-1 focus:ring-dark-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{t('Hora')}</label>
                    <input
                      type="time"
                      required
                      value={editingRes.time}
                      onChange={e => setEditingRes({ ...editingRes, time: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:border-dark-green focus:ring-1 focus:ring-dark-green transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{t('Personas')}</label>
                    <select
                      value={editingRes.guests}
                      onChange={e => setEditingRes({ ...editingRes, guests: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:border-dark-green focus:ring-1 focus:ring-dark-green transition-all appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'persona' : 'personas'}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{t('Ocasión')}</label>
                    <select
                      value={editingRes.occasion}
                      onChange={e => setEditingRes({ ...editingRes, occasion: e.target.value as any })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:border-dark-green focus:ring-1 focus:ring-dark-green transition-all appearance-none"
                    >
                      <option value="casual">{t('Casual')}</option>
                      <option value="business">{t('Negocios')}</option>
                      <option value="anniversary">{t('Aniversario')}</option>
                      <option value="birthday">{t('Cumpleaños')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Notas Especiales (Opcional)</label>
                  <textarea
                    value={editingRes.dishReference || ''}
                    onChange={e => setEditingRes({ ...editingRes, dishReference: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:border-dark-green focus:ring-1 focus:ring-dark-green transition-all resize-none h-24"
                    placeholder="Alergias, solicitudes especiales, etc."
                  />
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRes(null)}
                    className="px-6 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors"
                  >
                    {t('Cancelar')}
                  </button>
                  <button
                    type="submit"
                    className="bg-gold hover:bg-gold-light text-stone-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md"
                  >
                    <Save size={18} /> {t('Guardar Cambios')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL CONFIRMATION MODAL */}
      <AnimatePresence>
        {cancellingResId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center relative"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-serif text-stone-900 mb-2">¿Cancelar Reserva?</h3>
              <p className="text-stone-500 mb-6 text-sm">Esta acción informará al administrador y cambiará el estado de tu reserva a cancelada. ¿Estás seguro?</p>
              
              <div className="flex flex-col gap-3">
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
