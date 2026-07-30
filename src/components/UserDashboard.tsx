import React, { useState, useEffect } from 'react';
import { Reservation, AppData, Order, OrderItem } from '../types';
import { Clock, CheckCircle2, XCircle, Edit2, Calendar, User, Phone, X, Save, AlertTriangle, MessageCircle, Utensils, Plus, Trash2, Send, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceId } from '../hooks/useDeviceId';
import { useLanguage } from '../context/LanguageContext';

interface UserDashboardProps {
  reservations: Reservation[];
  data?: AppData;
  updateData?: (data: Partial<AppData>) => void;
  onUpdateReservation?: (id: string, newDetails: Partial<Reservation>) => void;
  onCancelReservation?: (id: string) => void;
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

export function UserDashboard({ reservations, data, updateData, onUpdateReservation, onCancelReservation }: UserDashboardProps) {
  const { t } = useLanguage();
  const [now, setNow] = useState(new Date());
  const deviceId = useDeviceId();

  const [activeTab, setActiveTab] = useState<'reservations' | 'order'>('reservations');

  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [cancellingResId, setCancellingResId] = useState<string | null>(null);

  // Client direct table order state
  const [clientTable, setClientTable] = useState('Mesa 1');
  const [clientName, setClientName] = useState('');
  const [selectedDishName, setSelectedDishName] = useState(data?.menuItems[0]?.name || '');
  const [dishRations, setDishRations] = useState<number>(1);
  const [cartItems, setCartItems] = useState<{ dishName: string; quantity: number; priceCUP: number }[]>([]);

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
    const target = new Date(`${date}T${time}`);
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

  return (
    <div className="pt-28 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-4xl font-serif text-dark-green mb-2">{t('Panel de Cliente')}</h2>
          <p className="text-stone-500">{t('Gestiona tus reservas o realiza un pedido directamente en el restaurante')}</p>
        </div>
        <a
          href="https://wa.me/5354413935?text=Hola%2053%26M%2C%20quisiera%20contactar%20con%20el%20administrador%20sobre%20mis%20reservas."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-[#20ba5a] transition-all shadow-md self-start sm:self-auto"
        >
          <MessageCircle size={16} /> {t('Contactar Administrador por WhatsApp')}
        </a>
      </div>

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
          <div className="flex justify-end mb-4 -mt-2">
            <span className="text-xs text-stone-400 font-mono bg-stone-50/60 px-2 py-1 rounded-lg border border-stone-100">
              ID del Dispositivo: {deviceId || 'DVC-00000'}
            </span>
          </div>
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
                  {res.status === 'paid' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center"><CheckCircle2 size={12} className="mr-1"/> {t('Confirmada')}</span>}
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
                        <MessageCircle size={14} /> Contactar Administrador por WhatsApp
                      </a>
                      <button
                        onClick={() => setEditingRes({ ...res })}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 size={14} /> Cambiar Fecha / Detalles
                      </button>
                      <button
                        onClick={() => setCancellingResId(res.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-red-200"
                      >
                        <XCircle size={14} /> Cancelar Reserva
                      </button>
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

          {/* ACTIVE CLIENT ORDERS FOR THIS TABLE */}
          {(() => {
            const tableOrders = (data?.orders || []).filter(o => o.tableNumber === clientTable);
            if (tableOrders.length === 0) return null;

            return (
              <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-emerald-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="text-gold" size={20} />
                    <h3 className="font-serif font-bold text-lg text-white">
                      Tus Pedidos en {clientTable} ({tableOrders.length})
                    </h3>
                  </div>
                  <span className="text-xs font-mono bg-emerald-900 text-emerald-200 px-3 py-1 rounded-full border border-emerald-700">
                    Mesa: {clientTable}
                  </span>
                </div>

                <div className="space-y-3">
                  {tableOrders.map(ord => {
                    const totalCUP = ord.orderItems?.reduce((acc, i) => acc + (i.priceCUP * i.quantity), 0) || 0;
                    return (
                      <div key={ord.id} className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700/60 space-y-3">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-bold text-gold">Pedido #{ord.id}</span>
                            <span className="text-emerald-300 ml-2 font-mono">
                              {new Date(ord.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            ord.status === 'kitchen_ready' ? 'bg-emerald-400 text-emerald-950 animate-pulse font-black' :
                            ord.status === 'kitchen_in_progress' ? 'bg-amber-400 text-amber-950' :
                            ord.status === 'delivered' ? 'bg-emerald-800 text-emerald-200' :
                            'bg-stone-700 text-stone-200'
                          }`}>
                            {ord.status === 'kitchen_ready' ? '🔔 ¡LISTO PARA SERVIR!' :
                             ord.status === 'kitchen_in_progress' ? '🍳 En Preparación' :
                             ord.status === 'delivered' ? '✓ Servido en Mesa' : '⏳ Pendiente'}
                          </span>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1 bg-emerald-950/80 p-3 rounded-xl border border-emerald-800 text-xs">
                          {ord.orderItems?.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-emerald-100">
                              <span><strong className="text-gold">{it.quantity}x</strong> {it.name}</span>
                              <span className="font-mono text-emerald-300">${(it.priceCUP * it.quantity).toLocaleString()} CUP</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-emerald-800 flex justify-between font-bold text-xs">
                            <span className="text-emerald-300">Total:</span>
                            <span className="text-white font-mono">
                              ${totalCUP.toLocaleString()} CUP • ${(totalCUP / usdCUP).toFixed(2)} USD • €{(totalCUP / eurCUP).toFixed(2)} EUR
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-dark-green">Conformar Pedido por Platos</h3>
                <p className="text-xs text-stone-500">Selecciona cada plato, especifica las raciones y agrégalo a tu comanda.</p>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  ℹ️ Los precios en USD y EUR son referenciales y se calculan según la tasa de cambio vigente.
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <ShoppingBag size={14} /> {cartItems.length} platos en borrador
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mesa en Restaurante</label>
                <select
                  value={clientTable}
                  onChange={e => setClientTable(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl p-2.5 text-xs font-bold bg-stone-50 outline-none"
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

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre (Opcional)</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl p-2.5 text-xs bg-stone-50 outline-none"
                />
              </div>
            </div>

            {/* Select Dish */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-stone-700">Seleccionar Platos del Menú</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                {(data?.menuItems || []).map((menuItem) => {
                  const isSelected = selectedDishName === menuItem.name;
                  return (
                    <div
                      key={menuItem.id}
                      onClick={() => {
                        if (!isSelected) {
                          setSelectedDishName(menuItem.name);
                          setDishRations(1);
                        }
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-center ${
                        isSelected
                          ? 'border-dark-green bg-emerald-50/60 ring-2 ring-dark-green/20'
                          : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <div className="text-xs font-bold text-stone-800">{menuItem.name}</div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            ${menuItem.priceCUP.toLocaleString()} CUP • ${(menuItem.priceCUP / usdCUP).toFixed(2)} USD • €{(menuItem.priceCUP / eurCUP).toFixed(2)} EUR
                          </div>
                        </div>
                        {!isSelected && (
                          <div className="text-stone-300">
                            <Plus size={16} />
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-emerald-200/50" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1">
                            <button type="button" onClick={() => setDishRations(Math.max(1, dishRations - 1))} className="px-2 text-stone-500 hover:text-stone-800">-</button>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={dishRations}
                              onChange={e => setDishRations(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-8 text-xs font-bold text-center bg-transparent outline-none"
                            />
                            <button type="button" onClick={() => setDishRations(dishRations + 1)} className="px-2 text-stone-500 hover:text-stone-800">+</button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={!isShiftActive}
                            className="flex-1 bg-dark-green text-white hover:bg-emerald-900 disabled:opacity-50 py-2 rounded-lg text-[11px] font-bold shadow-sm transition-all text-center"
                          >
                            Agregar al Pedido
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Preview */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4">
              <div className="flex justify-between items-center font-serif text-sm font-bold text-stone-800 border-b border-stone-200 pb-2">
                <span>Resumen de tu Pedido ({cartItems.length} platos)</span>
                <span className="text-dark-green font-mono text-base">${calculateCartTotal()} CUP</span>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs font-medium">
                  No has agregado platos a tu pedido aún. Selecciona un plato arriba y presiona "+ Agregar al Pedido".
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-dark-green mr-2">{item.quantity}x</span>
                        <span className="text-stone-800 font-semibold">{item.dishName}</span>
                        <span className="text-stone-400 text-[10px] ml-2 font-mono">(${item.priceCUP * item.quantity} CUP)</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleSubmitCartOrder}
                    disabled={!isShiftActive}
                    className="w-full mt-4 bg-gold text-dark-green hover:bg-amber-300 disabled:opacity-50 py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all uppercase tracking-wider"
                  >
                    <Send size={16} /> Enviar Pedido Completo al Dependiente
                  </button>
                </div>
              )}
            </div>
          </div>
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
                      value={editingRes.date}
                      onChange={e => setEditingRes({ ...editingRes, date: e.target.value })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Nueva Hora</label>
                    <input
                      type="time"
                      required
                      value={editingRes.time}
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
                      value={editingRes.guests}
                      onChange={e => setEditingRes({ ...editingRes, guests: Number(e.target.value) })}
                      className="w-full border-stone-200 rounded-xl text-sm py-2 px-3 focus:border-dark-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Ocasión</label>
                    <select
                      value={editingRes.occasion}
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
                    value={editingRes.name}
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
                      value={editingRes.phone}
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
