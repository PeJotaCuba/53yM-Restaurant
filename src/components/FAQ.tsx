import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function FAQ() {
  const { t } = useLanguage();

  const faqs = [
    { q: '¿Cómo puedo hacer una reserva?', a: 'La única vía para garantizar tu reserva es a través del formulario de esta página web, donde podrás seleccionar fecha, hora y detalles de tu visita de manera rápida y segura.' },
    { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos pagos en efectivo (CUP) y métodos electrónicos como Transfermóvil y EnZona. También aceptamos USD y Euros.' },
    { q: '¿Existe parqueo para motos y bicicletas?', a: 'Sí, muy cerca del Restaurante se ofrece ese servicio desde las 12:00 PM hasta las 11:00 PM.' }
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-dark-green mb-4 inline-block relative">
            {t('Preguntas Frecuentes')}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gold"></div>
          </h2>
        </div>

        <div className="space-y-4 mt-12">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50">
              <button 
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full text-left px-6 py-5 flex justify-between items-center bg-white hover:bg-stone-50 transition-colors"
              >
                <span className="font-serif text-lg text-stone-900 pr-8">{t(faq.q)}</span>
                <span className="text-gold flex-shrink-0">
                  {openIdx === idx ? <Minus size={20} /> : <Plus size={20} />}
                </span>
              </button>
              <AnimatePresence>
                {openIdx === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 pt-2 text-stone-600 leading-relaxed border-t border-stone-100">
                      {t(faq.a)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

