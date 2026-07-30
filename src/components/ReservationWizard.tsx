import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, Wine, ArrowRight, ArrowLeft, Check, QrCode, MessageCircle } from 'lucide-react';
import { Reservation } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ReservationWizardProps {
  initialDish?: string;
  onComplete: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>, advanceOrder: boolean) => void;
  onCancel: () => void;
}

export function ReservationWizard({ initialDish, onComplete, onCancel }: ReservationWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    guests: 2,
    occasion: 'Cena casual',
    name: '',
    email: '',
    phone: '',
    dishReference: initialDish || '',
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = (advanceOrder: boolean) => {
    onComplete({
      ...formData,
    }, advanceOrder);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  const adminWhatsAppUrl = `https://wa.me/5354413935?text=${encodeURIComponent('Hola 53&M, quisiera realizar una consulta al administrador sobre una reservación.')}`;

  return (
    <div className="bg-stone-50 min-h-screen py-12 md:py-24 px-4 sm:px-6 flex items-start md:items-center justify-center overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-stone-100 mt-8 md:mt-0 overflow-hidden">
        {/* Helper Banner for WhatsApp Contact */}
        <div className="bg-emerald-50 border-b border-emerald-100 p-3 px-6 flex flex-wrap items-center justify-between text-xs text-stone-700 gap-2">
          <span className="flex items-center gap-1.5 font-medium text-stone-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('¿Tienes dudas con tu reservación?')}
          </span>
          <a
            href={adminWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-1.5 rounded-xl font-bold hover:bg-[#20ba5a] transition-colors shadow-sm"
          >
            <MessageCircle size={14} /> {t('Contactar Administrador por WhatsApp')}
          </a>
        </div>

        {/* Progress Bar */}
        <div className="bg-stone-100 h-2 w-full">
          <div 
            className="bg-gold h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-8">
            <button 
              type="button"
              onClick={step === 1 ? onCancel : prevStep}
              className="text-stone-400 hover:text-stone-900 transition-colors flex items-center text-sm font-medium uppercase tracking-wider"
            >
              <ArrowLeft size={16} className="mr-2" /> {step === 1 ? t('Cancelar') : t('Atrás')}
            </button>
            <div className="text-sm font-medium text-stone-400 uppercase tracking-wider">
              {t('Paso')} {step} {t('de')} 4
            </div>
          </div>

          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait" custom={1}>
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div className="text-center mb-10">
                    <Calendar className="w-12 h-12 text-gold mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-dark-green">{t('¿Qué día nos visitas?')}</h2>
                  </div>
                  <div className="space-y-6 max-w-sm mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">{t('Fecha')}</label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => updateForm('date', e.target.value)}
                        className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">{t('Hora')}</label>
                      <input 
                        type="time" 
                        value={formData.time}
                        onChange={(e) => updateForm('time', e.target.value)}
                        className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold outline-none transition-all"
                      />
                    </div>
                    <button 
                      type="button"
                      disabled={!formData.date || !formData.time}
                      onClick={nextStep}
                      className="w-full bg-dark-green text-white py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 transition-colors hover:bg-stone-800 flex items-center justify-center mt-8"
                    >
                      {t('Siguiente')} <ArrowRight size={18} className="ml-2" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div className="text-center mb-10">
                    <Users className="w-12 h-12 text-gold mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-dark-green">{t('¿Para cuántas personas?')}</h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => {
                          updateForm('guests', num);
                          setTimeout(nextStep, 300);
                        }}
                        className={`py-6 rounded-2xl text-2xl font-serif transition-all ${
                          formData.guests === num 
                            ? 'bg-gold text-stone-900 shadow-md transform scale-105' 
                            : 'bg-stone-50 border border-stone-200 text-stone-600 hover:border-gold'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <div className="text-center pt-4 border-t border-stone-100 max-w-lg mx-auto">
                    <p className="text-xs text-stone-500 mb-2">{t('¿Grupo grande o reserva corporativa?')}</p>
                    <a
                      href={`https://wa.me/5354413935?text=${encodeURIComponent('Hola 53&M, desearía solicitar información para una reserva de grupo especial o evento.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#25D366] font-bold text-xs hover:underline"
                    >
                      <MessageCircle size={14} /> {t('Solicitar reserva de grupo al Administrador por WhatsApp')}
                    </a>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div className="text-center mb-10">
                    <Wine className="w-12 h-12 text-gold mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-dark-green">{t('¿Alguna ocasión especial?')}</h2>
                  </div>
                  <div className="space-y-4 max-w-md mx-auto">
                    {['Cena casual', 'Cumpleaños', 'Aniversario', 'Negocios'].map(occ => (
                      <button
                        type="button"
                        key={occ}
                        onClick={() => updateForm('occasion', occ)}
                        className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center justify-between ${
                          formData.occasion === occ 
                            ? 'bg-stone-900 text-white' 
                            : 'bg-stone-50 border border-stone-200 text-stone-600 hover:border-gold'
                        }`}
                      >
                        {t(occ)}
                        {formData.occasion === occ && <Check size={20} className="text-gold" />}
                      </button>
                    ))}
                    
                    {formData.dishReference && (
                      <div className="mt-6 p-4 bg-stone-100 rounded-xl border border-stone-200 text-sm text-stone-600">
                        <strong>Nota:</strong> Has indicado interés en probar: <span className="italic">{formData.dishReference}</span>
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={nextStep}
                      className="w-full bg-dark-green text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-colors hover:bg-stone-800 flex items-center justify-center mt-8"
                    >
                      {t('Siguiente')} <ArrowRight size={18} className="ml-2" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-serif text-dark-green">{t('Datos de Contacto')}</h2>
                  </div>
                  <div className="space-y-4 max-w-md mx-auto">
                    <input 
                      type="text" 
                      placeholder={t('Nombre completo')}
                      value={formData.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold outline-none"
                    />
                    <input 
                      type="tel" 
                      placeholder={t('Teléfono')}
                      value={formData.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold outline-none"
                    />
                    
                    <div className="pt-6 border-t border-stone-100 flex flex-col gap-3 mt-6">
                      <button 
                        type="button"
                        disabled={!formData.name.trim() || !formData.phone.trim()}
                        onClick={() => handleSubmit(true)}
                        className="w-full bg-gold text-stone-900 py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 transition-colors hover:bg-gold-light flex items-center justify-center shadow-md cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t('Adelantar Pedidos del Menú')}
                      </button>
                      <button 
                        type="button"
                        disabled={!formData.name.trim() || !formData.phone.trim()}
                        onClick={() => handleSubmit(false)}
                        className="w-full bg-dark-green text-white py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 transition-colors hover:bg-stone-800 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t('Solo Enviar Reserva')}
                      </button>


                      {/* Direct WhatsApp button with administrator */}
                      <a
                        href={`https://wa.me/5354413935?text=${encodeURIComponent(`Hola 53&M, deseo comunicarme con el administrador por mi reserva a nombre de ${formData.name || 'Cliente'} para el ${formData.date} a las ${formData.time}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider transition-colors hover:bg-[#20ba5a] flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm mt-1"
                      >
                        <MessageCircle size={18} /> Contactar Administrador por WhatsApp
                      </a>

                      <p className="text-xs text-center text-stone-400 mt-2">
                        Serás redirigido a WhatsApp para confirmar los detalles.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

