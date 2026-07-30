import React from 'react';
import { Utensils, Wine, Leaf, PartyPopper } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Wine,
  Leaf,
  PartyPopper
};

export function Services({ services }: { services: { icon: string; title: string; description: string; }[] }) {
  const { t } = useLanguage();

  return (
    <section id="services" className="py-20 bg-stone-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif mb-4 inline-block relative">
            {t('Nuestros Servicios')}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gold"></div>
          </h2>
          <p className="text-stone-400 mt-8 text-lg font-light">{t('Experiencias diseñadas para todos los sentidos')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {services.map((svc, idx) => {
            const IconComp = ICON_MAP[svc.icon] || Utensils;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-stone-800/50 p-8 rounded-2xl text-center border border-stone-700/50 hover:border-gold transition-colors group"
              >
                <IconComp className="w-12 h-12 text-gold mx-auto mb-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <h4 className="text-xl font-serif mb-3 text-stone-100">{t(svc.title)}</h4>
                <p className="text-stone-400 text-sm leading-relaxed">{t(svc.description)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

