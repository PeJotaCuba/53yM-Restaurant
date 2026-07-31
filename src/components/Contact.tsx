import React from 'react';
import { MapPin, Facebook, Instagram, Clock, Phone, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { LandingConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';

export function Contact({ onReserve, config }: { onReserve: () => void, config: LandingConfig }) {
  const { t } = useLanguage();

  return (
    <section id="contact" className="py-20 bg-stone-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full"
          >
            <h3 className="text-3xl font-serif text-dark-green mb-8">{t('Ubicación y Contacto')}</h3>
            
            <div className="space-y-6 text-stone-600 mb-10 flex flex-col items-center">
              <div className="flex items-center text-left w-full max-w-xs">
                <MapPin className="w-5 h-5 text-gold mr-4 flex-shrink-0" />
                <p>{config.contactAddress}</p>
              </div>
              <div className="flex items-center text-left w-full max-w-xs">
                <Facebook className="w-5 h-5 text-gold mr-4 flex-shrink-0" />
                <p>Restaurante-Terraza 53&M</p>
              </div>
              <div className="flex items-center text-left w-full max-w-xs">
                <Instagram className="w-5 h-5 text-gold mr-4 flex-shrink-0" />
                <p>@53ymrestaurante_bar_bayamo</p>
              </div>
              <div className="flex items-center text-left w-full max-w-xs">
                <Phone className="w-5 h-5 text-gold mr-4 flex-shrink-0" />
                <p>{config.contactPhone}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 max-w-sm mx-auto">
              <div className="flex flex-col items-center justify-center">
                <span className="font-medium text-stone-900 flex items-center mb-2"><Clock size={16} className="mr-2 text-gold"/> {t('Horario')}</span>
                <span className="text-stone-600 font-medium whitespace-pre-line text-center">
                  {config.contactHours.toUpperCase().replace(/:\s*/, '\n')}
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

