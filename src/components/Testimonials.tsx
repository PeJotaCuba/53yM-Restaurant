import React from 'react';
import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function Testimonials() {
  const { t } = useLanguage();

  const reviews = [
    { name: 'María G.', platform: 'CubaMaps', text: 'Definitivamente el lugar de lujo en Bayamo. El servicio fue impecable y los platos exquisitos. Un rincón diferente y delicioso.' },
    { name: 'Carlos R.', platform: 'Facebook', text: 'La ambientación de la terraza es hermosa, perfecta para celebrar un aniversario. La atención del personal es muy buena y profesional.' },
    { name: 'Ana P.', platform: 'Instagram', text: 'Se nota el compromiso con la calidad y con la comunidad. Los sabores son auténticos pero con una presentación elegante. Volveré seguro.' },
  ];

  return (
    <section id="testimonials" className="py-20 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif text-dark-green mb-4 inline-block relative">
            {t('Testimonios')}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gold"></div>
          </h2>
          <p className="text-stone-500 mt-8 text-lg font-light">{t('Lo que dicen nuestros clientes')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 relative"
            >
              <Quote className="absolute top-6 right-6 w-12 h-12 text-stone-100 rotate-180" />
              <div className="flex text-gold mb-6 relative z-10">
                {[1,2,3,4,5].map(star => <Star key={star} size={16} fill="currentColor" />)}
              </div>
              <p className="text-stone-600 italic mb-6 leading-relaxed relative z-10">"{t(rev.text)}"</p>
              <div className="font-bold text-dark-green text-sm relative z-10">- {rev.name} <span className="text-stone-400 font-normal">({rev.platform})</span></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

