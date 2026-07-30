import React from 'react';
import { motion } from 'motion/react';
import { Heart, CalendarCheck, Gift, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ICON_MAP: Record<string, any> = {
  Gift,
  Heart,
  CalendarCheck,
  Star
};

export function Promotions({ promotions }: { promotions: { icon: string; title: string; tag: string; desc: string; }[] }) {
  const { t } = useLanguage();

  return (
    <section id="promos" className="py-20 bg-dark-green text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif mb-4 inline-block relative">
            {t('Promociones y Eventos Especiales')}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gold"></div>
          </h2>
          <p className="text-stone-300 mt-8 text-lg font-light">{t('Porque te mereces lo mejor')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {promotions.map((promo, idx) => {
            const IconComp = ICON_MAP[promo.icon] || Star;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-stone-800/40 p-8 rounded-3xl text-center border border-gold/30 hover:bg-stone-800/60 transition-colors"
              >
                <div className="text-3xl font-serif font-bold text-gold mb-2">{t(promo.tag)}</div>
                <IconComp className="w-10 h-10 text-gold mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl font-serif text-white mb-4 mt-2">{t(promo.title)}</h3>
                <p className="text-stone-300 text-sm leading-relaxed">{t(promo.desc)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

