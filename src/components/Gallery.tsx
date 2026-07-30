import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function Gallery({ images }: { images: string[] }) {
  const { t } = useLanguage();
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  return (
    <section id="gallery" className="py-20 bg-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-dark-green mb-4 inline-block relative">
            {t('Galería de Momentos')}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gold"></div>
          </h2>
          <p className="text-stone-500 mt-8 text-lg font-light">{t('Conoce nuestros ambientes y la experiencia que te espera')}</p>
        </div>


        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
          {images.map((src, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative aspect-square overflow-hidden rounded-xl cursor-pointer group"
              onClick={() => setSelectedImg(src)}
            >
              <img 
                src={src} 
                alt={`Momentos ${idx + 1}`} 
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="text-white w-8 h-8" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedImg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/95 p-4"
            onClick={() => setSelectedImg(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/20 p-2 rounded-full"
              onClick={() => setSelectedImg(null)}
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImg} 
              alt="Ampliada" 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
