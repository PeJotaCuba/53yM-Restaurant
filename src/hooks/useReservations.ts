import { useState, useEffect } from 'react';
import { Reservation } from '../types';

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('53m_reservations');
    if (stored) {
      try {
        setReservations(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing reservations', e);
      }
    }
  }, []);

  const addReservation = (reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => {
    const newReservation: Reservation = {
      ...reservation,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      status: 'pending',
    };
    
    const updated = [...reservations, newReservation];
    setReservations(updated);
    localStorage.setItem('53m_reservations', JSON.stringify(updated));
    return newReservation;
  };

  const updateReservationStatus = (id: string, status: Reservation['status']) => {
    const updated = reservations.map(r => r.id === id ? { ...r, status } : r);
    setReservations(updated);
    localStorage.setItem('53m_reservations', JSON.stringify(updated));
  };

  return {
    reservations,
    addReservation,
    updateReservationStatus
  };
}
