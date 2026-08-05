import React, { useState, useEffect } from 'react';
import { Reservation, AppData, Order, OrderItem } from '../types';
import { Clock, CheckCircle2, XCircle, Edit2, Calendar, ShieldAlert, AlertTriangle, Utensils, Trash2, Send, ShoppingBag, Download, Check, MessageCircle, ArrowRight } from 'lucide-react';
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
  onReserve?: () => void;
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

export function UserDashboard({ reservations, data, updateData, onUpdateReservation, onCancelReservation, onOpenLogin, onReserve, onOrderWorkspace }: UserDashboardProps) {
  const { t } = useLanguage();
  const [now, setNow] = useState(new Date());
  const deviceId = useDeviceId();

  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [cancellingResId, setCancellingResId] = useState<string | null>(null);

  // Storage for dismissed cancelled reservations by client
  const [dismissedResIds, setDismissedResIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissedCancelledReservations');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleAcceptCancelledReservation = (resId: string) => {
    const updated = [...dismissedResIds, resId];
    setDismissedResIds(updated);
    try {
      localStorage.setItem('dismissedCancelledReservations', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
    if (cancelledReservationAlert?.id === resId) {
      setCancelledReservationAlert(null);
    }
  };

  // Real-time reservation notification states
  const [confirmedReservationAlert, setConfirmedReservationAlert] = useState<any | null>(null);
  const [cancelledReservationAlert, setCancelledReservationAlert] = useState<any | null>(null);

  const getAdminWhatsAppLink = (resInfo?: any) => {
    const rawPhone = (data?.adminConfig?.phone || '54413935').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 8 ? `53${rawPhone}` : rawPhone;
    const clientName = resInfo?.name || resInfo?.customerName;
    const text = clientName
      ? `Hola, me comunico respecto a la cancelación de mi reserva a nombre de ${clientName}${resInfo?.date ? ` del ${resInfo.date}` : ''}.`
      : `Hola, me comunico respecto a la cancelación de mi reserva en 53&M.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeReservations = [...(reservations || [])]
    .filter(r => !dismissedResIds.includes(r.id))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const prevReservationsRef = React.useRef<any[]>([]);

  useEffect(() => {
    const currentReservations = reservations || [];
    const prevReservations = prevReservationsRef.current;

    if (prevReservations.length > 0) {
      currentReservations.forEach(current => {
        const prev = prevReservations.find(p => p.id === current.id);
        if (prev) {
          if (prev.status === 'pending' && (current.status === 'confirmed' || current.status === 'paid')) {
            setConfirmedReservationAlert(current);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification("Reserva Confirmada 🎉", {
                body: `Tu reserva para el ${formatDateFriendly(current.date)} ha sido confirmada.`
              });
            }
          }
          if (prev.status !== 'cancelled' && current.status === 'cancelled') {
            if (!dismissedResIds.includes(current.id)) {
              setCancelledReservationAlert(current);
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification("Reserva Cancelada ⚠️", {
                  body: `Tu reserva ha sido cancelada. Para más información, por favor contacta con el administrador.`
                });
              }
            }
          }
        }
      });
    }

    prevReservationsRef.current = currentReservations;
  }, [reservations, dismissedResIds]);

  const clientOrders = (data?.orders || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

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

  const deviceRegistered = isDeviceRegistered(deviceId, data);

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'client_pending':
      case 'pending_dependent':
        return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-200"><Clock size={12} /> Pendiente de Validación</span>;
      case 'in_kitchen':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-blue-200"><Utensils size={12} /> En Cocina</span>;
      case 'kitchen_ready':
      case 'ready_to_serve':
        return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-purple-200"><CheckCircle2 size={12} /> Listo para Servir</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200"><CheckCircle2 size={12} /> Entregado en Mesa</span>;
      case 'paid':
      case 'closed':
        return <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-stone-300"><CheckCircle2 size={12} /> Comanda Cerrada</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto min-h-screen space-y-10">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-dark-green mb-1">{t('Mi Perfil')}</h2>
          <p className="text-stone-500 text-xs sm:text-sm">{t('Gestiona tus reservas y consulta el estado de tus pedidos en tiempo real')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-stone-500 font-mono bg-stone-100 px-3 py-2 rounded-2xl border border-stone-200" title="ID de este dispositivo">
            ID: {deviceId || 'DVC-00000'}
          </span>

          {deviceRegistered && onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="bg-gold/15 hover:bg-gold text-gold hover:text-stone-900 border border-gold/40 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
              title="Acceso para el personal autorizado"
            >
              <ShieldAlert size={14} />
              <span>{t('Acceso de Personal')}</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP ACTION BUTTONS: RESERVAR & HACER PEDIDO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Button 1: Reservar */}
        <button
          onClick={onReserve}
          className="group bg-gradient-to-br from-stone-900 to-stone-800 hover:to-dark-green text-white p-6 sm:p-8 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-between gap-4 border border-stone-700/60 active:scale-98 text-left cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/20 text-gold rounded-2xl group-hover:bg-gold group-hover:text-stone-950 transition-colors shrink-0">
              <Calendar size={32} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gold block mb-0.5">Mesa en Restaurante</span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">{t('Reservar')}</h3>
              <p className="text-xs text-stone-300 mt-1 leading-snug">Reserva fecha y hora anticipadamente.</p>
            </div>
          </div>
          <ArrowRight size={22} className="text-gold group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* Button 2: Hacer Pedido */}
        <button
          onClick={onOrderWorkspace}
          className="group bg-gradient-to-br from-emerald-950 via-dark-green to-stone-900 hover:from-dark-green hover:to-emerald-900 text-white p-6 sm:p-8 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-between gap-4 border border-emerald-700/50 active:scale-98 text-left cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500/20 text-emerald-300 rounded-2xl group-hover:bg-emerald-400 group-hover:text-stone-950 transition-colors shrink-0">
              <Utensils size={32} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-0.5">Menú Digital & Mesa</span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">{t('Hacer Pedido')}</h3>
              <p className="text-xs text-emerald-100 mt-1 leading-snug">Pide desde tu mesa o código QR.</p>
            </div>
          </div>
          <ArrowRight size={22} className="text-emerald-300 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      </div>

      {/* Real-Time Reservation Alerts */}
      {confirmedReservationAlert && (
        <div className="bg-green-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-green-400/85 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in relative">
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

      {cancelledReservationAlert && (
        <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-red-500/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/80 rounded-2xl text-3xl shrink-0 border border-red-500/40">
              ⚠️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-500 text-white font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Reserva Cancelada por Administración
                </span>
              </div>
              <h4 className="font-serif font-bold text-lg text-white">
                Tu reserva ha sido cancelada.
              </h4>
              <p className="text-xs text-stone-200 mt-1">
                Para más información, por favor contacta con el administrador.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href={getAdminWhatsAppLink(cancelledReservationAlert)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all flex-1 sm:flex-none"
            >
              <MessageCircle size={15} /> Contactar por WhatsApp
            </a>

            <button
              onClick={() => handleAcceptCancelledReservation(cancelledReservationAlert.id)}
              className="px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none"
            >
              <Check size={15} /> Aceptar
            </button>
          </div>
        </div>
      )}

      {/* MODULE 1: MIS RESERVAS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <h3 className="text-2xl font-serif text-dark-green font-bold flex items-center gap-2">
            <Calendar className="text-gold" size={24} /> {t('Mis Reservas')}
          </h3>
          <span className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full">
            {activeReservations.length} {activeReservations.length === 1 ? 'reserva' : 'reservas'}
          </span>
        </div>

        {activeReservations.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <Clock className="w-12 h-12 text-stone-300 mx-auto" />
            <h4 className="text-lg font-serif text-stone-700 font-bold">{t('No tienes reservas activas')}</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">{t('¿Listo para vivir una experiencia gastronómica en Terraza 53&M?')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeReservations.map((res, idx) => {
              const cd = getCountdown(res.date, res.time);
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={res.id || `res-${idx}`} 
                  className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 relative space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-3">
                    <div className="text-sm font-bold text-dark-green font-serif">
                      Reserva #{res.id.slice(-6)}
                    </div>

                    <div className="flex items-center gap-2">
                      {res.status === 'pending' && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-200"><Clock size={12}/> {t('Pendiente')}</span>}
                      {res.status === 'cancellation_pending' && <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-orange-200"><AlertTriangle size={12}/> {t('Cancelación Pendiente')}</span>}
                      {(res.status === 'paid' || res.status === 'confirmed') && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-green-200"><CheckCircle2 size={12}/> {t('Confirmada')}</span>}
                      {res.status === 'cancelled' && <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-red-200"><XCircle size={12}/> {t('Cancelada')}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 font-medium block">Fecha</span>
                      <span className="font-bold text-stone-900 text-sm">{formatDateFriendly(res.date)}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-medium block">Hora</span>
                      <span className="font-bold text-stone-900 text-sm">{formatTime12h(res.time)}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-medium block">Comensales</span>
                      <span className="font-bold text-stone-900 text-sm">{res.guests} personas</span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-medium block">Titular</span>
                      <span className="font-bold text-stone-900 text-sm">{res.name}</span>
                    </div>
                  </div>

                  {res.status === 'cancelled' ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs space-y-3">
                      <p className="font-semibold text-red-900">
                        Tu reserva ha sido cancelada por el administrador.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={getAdminWhatsAppLink(res)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                        >
                          <MessageCircle size={14} /> Contactar por WhatsApp
                        </a>

                        <button
                          onClick={() => handleAcceptCancelledReservation(res.id)}
                          className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                        >
                          <Check size={14} /> Aceptar
                        </button>
                      </div>
                    </div>
                  ) : (
                    res.status !== 'cancellation_pending' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200/60">
                        <button
                          onClick={() => setEditingRes({ ...res })}
                          className="bg-white hover:bg-stone-100 text-stone-800 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-stone-200 transition-colors"
                        >
                          <Edit2 size={13} /> {t('Modificar')}
                        </button>
                        <button
                          onClick={() => setCancellingResId(res.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-red-200 transition-colors"
                        >
                          <XCircle size={13} /> {t('Cancelar')}
                        </button>
                      </div>
                    )
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODULE 2: MIS PEDIDOS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <h3 className="text-2xl font-serif text-dark-green font-bold flex items-center gap-2">
            <Utensils className="text-emerald-600" size={24} /> {t('Mis Pedidos')}
          </h3>
          <span className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full">
            {clientOrders.length} {clientOrders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>

        {clientOrders.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <Utensils className="w-12 h-12 text-stone-300 mx-auto" />
            <h4 className="text-lg font-serif text-stone-700 font-bold">No has realizado pedidos aún</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">Realiza un pedido desde tu mesa usando el Menú Digital.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clientOrders.map((ord, idx) => (
              <div key={ord.id || `ord-${idx}`} className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-stone-600">#{ord.id}</span>
                    <span className="bg-stone-200 text-stone-800 font-bold px-2.5 py-0.5 rounded text-[11px]">
                      {ord.tableNumber || 'Mesa'}
                    </span>
                  </div>
                  {getOrderStatusBadge(ord.status)}
                </div>

                <div className="space-y-1">
                  <span className="text-stone-400 font-bold text-[11px] block uppercase">Platos Solicitados:</span>
                  <p className="font-bold text-stone-900 text-sm">
                    {ord.orderItems && ord.orderItems.length > 0
                      ? ord.orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ')
                      : (ord.items || []).join(', ')}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-200/60">
                  <span>
                    Hora: {new Date(ord.timestamp || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {ord.totalCUP && (
                    <span className="font-bold text-dark-green">
                      Total: ${ord.totalCUP.toLocaleString()} CUP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{t('Hora')}</label>
                    <input
                      type="time"
                      required
                      value={editingRes.time}
                      onChange={e => setEditingRes({ ...editingRes, time: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{t('Personas')}</label>
                    <select
                      value={editingRes.guests}
                      onChange={e => setEditingRes({ ...editingRes, guests: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold"
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
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold"
                    >
                      <option value="casual">{t('Casual')}</option>
                      <option value="business">{t('Negocios')}</option>
                      <option value="anniversary">{t('Aniversario')}</option>
                      <option value="birthday">{t('Cumpleaños')}</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRes(null)}
                    className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs"
                  >
                    {t('Cancelar')}
                  </button>
                  <button
                    type="submit"
                    className="bg-gold hover:bg-gold-light text-stone-900 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    {t('Guardar Cambios')}
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
