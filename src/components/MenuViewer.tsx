import React, { useState } from 'react';
import { MenuItem, ExchangeRateConfig } from '../types';
import { X, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface MenuViewerProps {
  onReserveItem?: (itemName: string) => void;
  isPreview?: boolean;
  onConsultMenu?: () => void;
  menuItems: MenuItem[];
  exchangeRate?: ExchangeRateConfig;
}

export function MenuViewer({ onReserveItem, isPreview = false, onConsultMenu, menuItems, exchangeRate }: MenuViewerProps) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const usdCUP = exchangeRate?.usdCUP || 320;
  const eurCUP = exchangeRate?.eurCUP || 350;
  
  // Deduplicate items by dish name to ensure no repeated dishes
  const uniqueItems: MenuItem[] = [];
  const seenNames = new Set<string>();

  for (const item of (menuItems || [])) {
    const key = item.name ? item.name.trim().toLowerCase() : item.id;
    if (!seenNames.has(key)) {
      seenNames.add(key);
      uniqueItems.push(item);
    }
  }

  const categories = ['Todos', ...Array.from(new Set(uniqueItems.map(item => item.category)))];

  const filteredItems = activeCategory === 'Todos' 
    ? uniqueItems 
    : uniqueItems.filter(item => item.category === activeCategory);
    
  // In preview ("Los más populares"), limit strictly to 4 unique dishes
  const displayItems = isPreview ? uniqueItems.slice(0, 4) : filteredItems;

  return (
    <section className="py-24 bg-white" id="menu">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4 inline-block relative">
            {isPreview ? t('Los más populares') : t('Nuestro Menú')}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gold"></div>
          </h2>
          <p className="text-stone-500 mt-8 text-lg font-light">{t('Sabores que cuentan historias')}</p>
        </div>

        {/* Swipeable Tabs */}
        {!isPreview && (
          <div className="flex overflow-x-auto hide-scrollbar mb-12 gap-4 pb-4 snap-x">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`snap-start whitespace-nowrap px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat 
                    ? 'bg-dark-green text-white shadow-md' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat === 'Todos' ? t('Todas las Categorías') : t(cat)}
              </button>
            ))}
          </div>
        )}

        {/* Exchange Rate Disclaimer */}
        <div className="text-center text-xs text-stone-500 font-medium my-4 flex items-center justify-center gap-1.5 bg-stone-50 py-2 px-4 rounded-full border border-stone-100 max-w-fit mx-auto">
          <Info size={14} className="text-gold shrink-0" />
          <span>Los precios expresados en USD y euros están sujetos a la tasa de cambio vigente.</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayItems.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow cursor-pointer border border-stone-100"
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">{t(item.category)}</div>
                <h4 className="text-xl font-serif text-dark-green mb-2">{t(item.name)}</h4>
                <p className="text-stone-500 text-sm line-clamp-2">{t(item.shortDescription)}</p>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-dark-green text-base font-serif">${item.priceCUP.toLocaleString()} CUP</span>
                    <span className="block text-[11px] text-stone-400 font-mono">
                      ${(item.priceCUP / usdCUP).toFixed(2)} USD • €{(item.priceCUP / eurCUP).toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center text-xs font-bold text-gold group">
                    {t('Descubrir')} <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {isPreview && onConsultMenu && (
          <div className="mt-16 text-center">
            <button 
              onClick={onConsultMenu}
              className="bg-dark-green text-white px-10 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-lg"
            >
              {t('Ver Menú Completo')}
            </button>
          </div>
        )}
      </div>

      {/* Modern Modal / Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <X size={20} className="text-stone-900" />
              </button>
              <div className="md:w-1/2 h-64 md:h-auto">
                <img 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.name}
                  className="w-full h-full object-cover rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none"
                />
              </div>
              
              <div className="md:w-1/2 p-8 md:p-10 flex flex-col justify-between bg-stone-50 md:rounded-r-3xl">
                <div>
                  <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">{t(selectedItem.category)}</div>
                  <h3 className="text-3xl font-serif text-dark-green mb-6">{t(selectedItem.name)}</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-stone-600 leading-relaxed">{t(selectedItem.sensoryDescription)}</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-dark-green font-serif text-lg">
                        <Info size={18} className="text-gold" />
                        {t('Nuestra Historia')}
                      </div>
                      <p className="text-sm text-stone-500 italic leading-relaxed">{t(selectedItem.story)}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-3">{t('Ingredientes Principales')}</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.ingredients.map((ing, i) => (
                          <span key={i} className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full text-xs font-medium">
                            {t(ing)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {!isPreview && (
                  <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <div className="text-2xl font-serif font-bold text-stone-900">${selectedItem.priceCUP.toLocaleString()} CUP</div>
                      <div className="text-xs font-mono font-bold text-dark-green mt-1">
                        ${(selectedItem.priceCUP / usdCUP).toFixed(2)} USD • €{(selectedItem.priceCUP / eurCUP).toFixed(2)} EUR
                      </div>
                    </div>
                    {onReserveItem && (
                      <button 
                        onClick={() => {
                          onReserveItem(selectedItem.name);
                          setSelectedItem(null);
                        }}
                        className="w-full sm:w-auto bg-dark-green hover:bg-stone-800 text-white px-8 py-4 rounded-full uppercase text-sm font-bold tracking-wider transition-colors"
                      >
                        {t('Reservar Mesa')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

