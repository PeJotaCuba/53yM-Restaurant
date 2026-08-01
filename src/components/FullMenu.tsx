import React, { useState, useEffect } from 'react';
import { MenuItem, ExchangeRateConfig } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Send, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { useLanguage } from '../context/LanguageContext';

export function FullMenu({ 
  onClose, 
  pendingReservation, 
  menuItems, 
  exchangeRate,
  onSubmitReservationAndOrder,
  updateData,
  prefilledTable,
  prefilledName,
  isOrderMode = true
}: { 
  onClose?: () => void, 
  pendingReservation?: any, 
  menuItems: MenuItem[], 
  exchangeRate?: ExchangeRateConfig,
  onSubmitReservationAndOrder?: (reservation: any, cartItems: any[], totalPrice: number) => Promise<any>,
  updateData?: (data: any) => void,
  prefilledTable?: string,
  prefilledName?: string,
  isOrderMode?: boolean
}) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
  const [tableNumber, setTableNumber] = useState(prefilledTable || '');
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (prefilledTable) {
      setTableNumber(prefilledTable);
    }
  }, [prefilledTable]);

  const usdCUP = exchangeRate?.usdCUP || 320;
  const eurCUP = exchangeRate?.eurCUP || 350;

  const categories = ['Todos', ...Array.from(new Set((menuItems || []).map(item => item.category)))];


  const filteredItems = (menuItems || []).filter(item => {
    const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.item.id === itemId) {
        const newQ = p.quantity + delta;
        return newQ > 0 ? { ...p, quantity: newQ } : p;
      }
      return p;
    }).filter(p => p.quantity > 0));
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(p => p.item.id !== itemId));
  };

  const getQuantity = (itemId: string) => {
    return cart.find(c => c.item.id === itemId)?.quantity || 0;
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cart.reduce((acc, curr) => acc + (curr.item.priceCUP * curr.quantity), 0);

  const handleSendOrder = async () => {
    if (!pendingReservation && !tableNumber) {
      alert("Por favor, ingrese su número de mesa.");
      return;
    }
    
    // Check if we are checking out an advanced reservation order
    if (pendingReservation && onSubmitReservationAndOrder) {
      try {
        await onSubmitReservationAndOrder(pendingReservation, cart, totalPrice);
        setCart([]); // Clear client cart state completely upon success
        if (onClose) onClose();
        return;
      } catch (err) {
        console.warn("Failed to submit reservation and order dynamically:", err);
        return;
      }
    }

    const cleanTable = tableNumber ? (tableNumber.toLowerCase().includes('mesa') ? tableNumber : `Mesa ${tableNumber.replace(/\D/g, '') || tableNumber}`) : 'Mesa 1';
    const formattedItems = cart.map(c => `${c.quantity}x ${c.item.name}`);
    const orderItemsList = cart.map(c => ({
      name: c.item.name,
      quantity: c.quantity,
      priceCUP: c.item.priceCUP,
      priceUSD: c.item.priceUSD || (c.item.priceCUP / usdCUP)
    }));

    const newOrder = {
      id: `ORD-${Date.now()}`,
      tableNumber: cleanTable,
      items: formattedItems,
      orderItems: orderItemsList,
      totalAmountCUP: totalPrice,
      totalAmountUSD: totalPrice / usdCUP,
      status: 'client_pending',
      timestamp: Date.now()
    };

    if (updateData) {
      const log = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        dateStr: new Date().toLocaleDateString('es-ES'),
        role: 'Cliente' as const,
        userOrDevice: prefilledName?.trim() || 'Cliente',
        action: 'Pedido Solicitado en Mesa',
        details: `Cliente solicitó pedido de ${cart.length} plato(s) en ${cleanTable} (Enviado a Dependiente desde Menú Visual).`
      };
      updateData({ 
        orders: [newOrder],
        auditLogs: [log]
      });
    }

    alert(`✅ ¡Pedido enviado con éxito para ${cleanTable}!\n\nEl dependiente asignado a tu mesa ha recibido tu comanda en tiempo real.`);
    setCart([]);
    setIsCartOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pt-20 pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors hidden md:block"
                title="Volver"
              >
                <ChevronRight size={24} className="text-stone-600 transform rotate-180" />
              </button>
            )}
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900 flex items-center">
              {t('Menú')} <Logo variant="svg" className="h-10 ml-4 inline-block" />
            </h1>
          </div>
          {isOrderMode && (
            <>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="hidden md:flex bg-dark-green text-white px-6 py-3 rounded-full items-center gap-3 hover:bg-stone-800 transition-colors shadow-lg"
              >
                <ShoppingCart size={20} />
                <span className="font-bold">{t('Revisar Pedido')}</span>
                {totalItems > 0 && (
                  <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                    <span className="bg-gold text-dark-green text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
                    <span>{totalPrice.toLocaleString()} CUP</span>
                  </div>
                )}
              </button>
              
              <button 
                onClick={() => setIsCartOpen(true)}
                className="md:hidden bg-dark-green text-white p-3 rounded-full flex items-center justify-center hover:bg-stone-800 transition-colors shadow-lg relative"
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold text-dark-green text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {totalItems}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto hide-scrollbar mb-6 gap-4 pb-4 snap-x">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start whitespace-nowrap px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat 
                  ? 'bg-dark-green text-white shadow-md' 
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat === 'Todos' ? t('Todas las Categorías') : t(cat)}
            </button>
          ))}
        </div>

        {/* Search & Exchange Note */}
        <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <input 
            type="text" 
            placeholder={t('Buscar plato o ingrediente...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:max-w-md bg-white border border-stone-200 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent shadow-sm text-sm"
          />
          <div className="text-xs text-stone-500 bg-stone-100/80 px-4 py-2 rounded-full border border-stone-200 text-center font-medium">
            ℹ️ Los precios expresados en USD y EUR son referenciales y están sujetos a la tasa de cambio vigente.
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-stone-100 flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-2xl text-xs font-bold text-dark-green shadow-sm text-right">
                  <div>${item.priceCUP.toLocaleString()} CUP</div>
                  <div className="text-[10px] text-stone-500 font-mono font-semibold">
                    ${(item.priceCUP / usdCUP).toFixed(2)} USD • €{(item.priceCUP / eurCUP).toFixed(2)} EUR
                  </div>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">{t(item.category)}</div>
                <h4 className="text-lg font-serif text-dark-green mb-2 leading-tight">{t(item.name)}</h4>
                <p className="text-stone-500 text-sm line-clamp-2 mb-4 flex-grow">{t(item.shortDescription)}</p>
                <div className="mt-auto">
                  {isOrderMode ? (
                    getQuantity(item.id) > 0 ? (
                      <div className="flex items-center justify-between bg-stone-100 rounded-xl p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-2 text-stone-600 hover:text-dark-green hover:bg-stone-200 rounded-lg transition-colors"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="font-bold text-dark-green">{getQuantity(item.id)}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-2 text-stone-600 hover:text-dark-green hover:bg-stone-200 rounded-lg transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(item)}
                        className="w-full bg-stone-100 hover:bg-gold hover:text-white text-dark-green font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> {prefilledTable ? t('Añadir al Pedido') : t('Añadir a mi Reserva')}
                      </button>
                    )
                  ) : (
                    <div className="text-center py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100">
                      ✨ {t('Disponible')}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          ))}
        </div>
      </div>

      {/* Shopping Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <h2 className="text-2xl font-serif text-dark-green flex items-center gap-2">
                  <ShoppingCart /> Tu Pedido
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <ChevronRight size={24} className="text-stone-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center text-stone-500 mt-20 flex flex-col items-center">
                    <ShoppingCart size={48} className="mb-4 text-stone-300" />
                    <p>No hay platos en tu pedido.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map(c => (
                      <div key={c.item.id} className="flex gap-4 items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                        <img src={c.item.imageUrl} alt={c.item.name} className="w-16 h-16 object-cover rounded-xl shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-dark-green truncate">{c.item.name}</h4>
                          <div className="text-sm text-stone-500">{c.item.priceCUP.toLocaleString()} CUP</div>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 p-1 shadow-sm">
                          <button onClick={() => updateQuantity(c.item.id, -1)} className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{c.quantity}</span>
                          <button onClick={() => updateQuantity(c.item.id, 1)} className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
                            <Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => removeItem(c.item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors ml-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-stone-100 p-6 bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-stone-500">Total Pedido</span>
                    <span className="text-3xl font-serif text-dark-green font-bold">{totalPrice.toLocaleString()} CUP</span>
                  </div>
                  
                  <div>
                    {!pendingReservation && !prefilledTable && (
                      <div className="mb-4">
                        <label htmlFor="tableNumber" className="block text-sm font-medium text-stone-700 mb-1">
                          Número de Mesa <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="number" 
                          id="tableNumber"
                          value={tableNumber}
                          onChange={e => setTableNumber(e.target.value)}
                          className="w-full border-stone-300 rounded-xl shadow-sm focus:border-gold focus:ring focus:ring-gold/20 py-3 px-4 outline-none border transition-all"
                          placeholder="Ej. 12"
                        />
                      </div>
                    )}
                    
                    {prefilledTable && (
                      <div className="mb-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('Mesa Asociada')}:</span>
                        <span className="bg-dark-green text-white font-mono font-bold text-sm px-3 py-1 rounded-lg shadow-xs">{prefilledTable}</span>
                      </div>
                    )}
                    
                    <button 
                      type="button"
                      onClick={handleSendOrder}
                      className="w-full bg-dark-green hover:bg-stone-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider transition-colors shadow-lg"
                    >
                      <Send size={18} /> {pendingReservation ? t('Enviar Reserva y Pedido') : t('Enviar Pedido')}
                    </button>
                    <p className="text-xs text-center text-stone-400 mt-4">
                      {prefilledTable ? t('Tu comanda se enviará en tiempo real al camarero de tu mesa.') : t('Serás redirigido a WhatsApp para confirmar tu pedido.')}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sticky Bottom Bar for Cart */}
      {isOrderMode && !isCartOpen && totalItems > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 w-full p-4 bg-white border-t border-stone-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-50">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-dark-green text-white px-6 py-4 rounded-full flex items-center justify-between hover:bg-stone-800 transition-colors shadow-lg"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} />
              <span className="font-bold">{totalItems} platos</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-gold">{totalPrice.toLocaleString()} CUP</span>
              <span className="font-bold uppercase tracking-wider border-l border-white/20 pl-3">Revisar</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
