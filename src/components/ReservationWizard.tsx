import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, Wine, ArrowRight, ArrowLeft, Check, QrCode, X } from 'lucide-react';
import { Reservation } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ReservationWizardProps {
  initialDish?: string;
  onComplete: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>, advanceOrder: boolean) => void;
  onCancel: () => void;
}

const TIME_SLOTS = [
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM'
];

export function ReservationWizard({ initialDish, onComplete, onCancel }: ReservationWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: todayStr,
    time: '',
    guests: 2,
    occasion: 'Cena casual',
    name: localStorage.getItem('clientUserName') || '',
    email: '',
    phone: localStorage.getItem('clientPhone') || '',
    dishReference: initialDish || '',
  });

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupGuests, setGroupGuests] = useState(10);
  const [groupName, setGroupName] = useState('');

  const cleanPhone = formData.phone.replace(/\D/g, '');
  const isPhoneValid = cleanPhone.length === 8;

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSelectTime = (slot: string) => {
    if (!formData.date) {
      alert('Por favor, selecciona primero la fecha.');
      return;
    }
    updateForm('time', slot);
    setTimeout(nextStep, 300);
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(10, Number(groupGuests) || 10);
    updateForm('guests', count);
    if (groupName.trim()) {
      updateForm('occasion', `Grupo: ${groupName.trim()}`);
    } else {
      updateForm('occasion', 'Reserva de Grupo');
    }
    setShowGroupModal(false);
    setTimeout(nextStep, 300);
  };

  const handleSubmit = (advanceOrder: boolean) => {
    if (!isPhoneValid) {
      alert('El número de teléfono debe tener exactamente 8 dígitos.');
      return;
    }
    if (formData.name.trim()) {
      localStorage.setItem('clientUserName', formData.name.trim());
    }
    if (formData.phone.trim()) {
      localStorage.setItem('clientPhone', formData.phone.trim());
    }
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

  return (
    <div className="bg-stone-50 min-h-screen py-12 md:py-24 px-4 sm:px-6 flex items-start md:items-center justify-center overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-stone-100 mt-8 md:mt-0 overflow-hidden relative">
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
              className="text-stone-400 hover:text-stone-900 transition-colors flex items-center text-sm font-medium uppercase tracking-wider cursor-pointer"
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
                  <div className="text-center mb-8">
                    <Calendar className="w-12 h-12 text-gold mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-dark-green">{t('¿Qué día y hora nos visitas?')}</h2>
                  </div>
                  <div className="space-y-6 max-w-md mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">{t('Selecciona la fecha')}</label>
                      <input 
                        type="date" 
                        min={todayStr}
                        value={formData.date}
                        onChange={(e) => updateForm('date', e.target.value)}
                        className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold outline-none transition-all font-medium text-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">{t('Selecciona la hora')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {TIME_SLOTS.map(slot => (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => handleSelectTime(slot)}
                            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                              formData.time === slot
                                ? 'bg-gold text-stone-900 border-gold shadow-md scale-105'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-gold hover:bg-amber-50/50'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
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
                  <div className="text-center mb-8">
                    <Users className="w-12 h-12 text-gold mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-dark-green">{t('¿Para cuántas personas?')}</h2>
                  </div>

                  <div className="grid grid-cols-3 gap-3.5 max-w-md mx-auto mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => {
                          updateForm('guests', num);
                          setTimeout(nextStep, 300);
                        }}
                        className={`py-5 rounded-2xl text-2xl font-serif font-bold transition-all cursor-pointer ${
                          formData.guests === num 
                            ? 'bg-gold text-stone-900 shadow-md transform scale-105' 
                            : 'bg-stone-50 border border-stone-200 text-stone-700 hover:border-gold hover:bg-amber-50/50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <div className="text-center max-w-md mx-auto pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(true)}
                      className="w-full py-3.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-dark-green font-bold text-sm border border-stone-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users size={16} />
                      {t('Reservar para grupos o cantidad mayor')}
                    </button>
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
                  <div className="text-center mb-8">
                    <Wine className="w-12 h-12 text-gold mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-dark-green">{t('¿Alguna ocasión especial?')}</h2>
                  </div>
                  <div className="space-y-3.5 max-w-md mx-auto">
                    {['Cena casual', 'Cumpleaños', 'Aniversario', 'Negocios'].map(occ => (
                      <button
                        type="button"
                        key={occ}
                        onClick={() => {
                          updateForm('occasion', occ);
                          setTimeout(nextStep, 300);
                        }}
                        className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                          formData.occasion === occ 
                            ? 'bg-stone-900 text-white shadow-md' 
                            : 'bg-stone-50 border border-stone-200 text-stone-700 hover:border-gold hover:bg-amber-50/50'
                        }`}
                      >
                        <span>{t(occ)}</span>
                        {formData.occasion === occ && <Check size={20} className="text-gold" />}
                      </button>
                    ))}
                    
                    {formData.dishReference && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-stone-700">
                        <strong>Nota:</strong> Has indicado interés en probar: <span className="italic font-semibold">{formData.dishReference}</span>
                      </div>
                    )}
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
                      placeholder={t('Teléfono (8 dígitos)')}
                      value={formData.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold outline-none"
                    />
                    <div className="text-[11px] px-1">
                      {formData.phone && !isPhoneValid ? (
                        <span className="text-red-500 font-medium">⚠️ El teléfono debe tener exactamente 8 dígitos (actual: {cleanPhone.length})</span>
                      ) : (
                        <span className="text-stone-500">Obligatorio: exactamente 8 dígitos (ej. 54413935)</span>
                      )}
                    </div>
                    
                    <div className="pt-6 border-t border-stone-100 flex flex-col gap-3 mt-6">
                      <button 
                        type="button"
                        disabled={!formData.name.trim() || !isPhoneValid}
                        onClick={() => handleSubmit(true)}
                        className="w-full bg-gold text-stone-900 py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 transition-colors hover:bg-gold-light flex items-center justify-center shadow-md cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t('Adelantar Pedidos del Menú')}
                      </button>
                      <button 
                        type="button"
                        disabled={!formData.name.trim() || !isPhoneValid}
                        onClick={() => handleSubmit(false)}
                        className="w-full bg-dark-green text-white py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 transition-colors hover:bg-stone-800 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t('Solo Enviar Reserva')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Group Reservation Internal Modal */}
        {showGroupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-100 relative"
            >
              <button 
                onClick={() => setShowGroupModal(false)}
                className="absolute top-5 right-5 text-stone-400 hover:text-stone-800 p-1 rounded-full"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <Users className="w-10 h-10 text-gold mx-auto mb-2" />
                <h3 className="text-2xl font-serif text-dark-green font-bold">Reserva para Grupos</h3>
                <p className="text-xs text-stone-500 mt-1">Ingresa los detalles del grupo para continuar con tu solicitud</p>
              </div>

              <form onSubmit={handleGroupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Nombre del grupo o evento (opcional)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej. Cumpleaños Carlos / Empresa XYZ"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Número de personas (Mínimo 10)
                  </label>
                  <input 
                    type="number"
                    min="10"
                    max="100"
                    value={groupGuests}
                    onChange={(e) => setGroupGuests(Number(e.target.value))}
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold outline-none text-sm font-bold text-stone-800"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGroupModal(false)}
                    className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gold hover:bg-amber-400 text-stone-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}


