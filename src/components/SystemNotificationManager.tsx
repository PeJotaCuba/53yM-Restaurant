import React, { useState, useEffect, useRef } from 'react';
import { AppData } from '../types';
import { Bell } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface SystemNotificationManagerProps {
  data: AppData;
  currentView: string;
  deviceId: string;
}

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function SystemNotificationManager({ data, currentView, deviceId }: SystemNotificationManagerProps) {
  const saveSubscriptionMutation = useMutation((api as any).notifications.saveSubscription);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Skip notifications that existed BEFORE the app session loaded to avoid historical spam
  const sessionStartTimeRef = useRef(Date.now());
  const processedNotifsRef = useRef<Set<string>>(new Set());

  // Determine active role based on currentView
  const getActiveRole = (): string => {
    if (currentView === 'order_workspace' || currentView === 'dashboard') return 'client';
    if (currentView === 'dependent') return 'dependent';
    if (currentView === 'kitchen') return 'kitchen';
    if (currentView === 'manager') return 'manager';
    if (currentView === 'admin') return 'admin';
    return 'none';
  };

  const activeRole = getActiveRole();

  useEffect(() => {
    if (permission === 'default') {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  // Listen to incoming notifications in data.notifications
  useEffect(() => {
    if (!data.notifications || data.notifications.length === 0) return;

    // Filter notifications targeting the activeRole (or 'all')
    const newNotifications = data.notifications.filter(notif => {
      const isTarget = notif.targetRole === 'all' || notif.targetRole === activeRole;
      const isNew = notif.timestamp > sessionStartTimeRef.current;
      const notProcessed = !processedNotifsRef.current.has(notif.id);
      return isTarget && isNew && notProcessed;
    });

    if (newNotifications.length > 0) {
      newNotifications.forEach(notif => {
        processedNotifsRef.current.add(notif.id);

        // 1. Play sound via Web Audio API synthesizer
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (err) {
          console.warn('[Notifications] Sound synthesis blocked or failed:', err);
        }

        // 2. PWA Notification via Service Worker (In-app fallback)
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(notif.title, {
              body: notif.message,
              icon: '/favicon.ico',
              vibrate: [100, 50, 100],
              tag: notif.id,
              requireInteraction: false
            } as any);
          }).catch(() => {
            // Fallback to simple Notification
            new Notification(notif.title, { body: notif.message });
          });
        } else if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title, { body: notif.message });
        }
      });
    }
  }, [data.notifications, activeRole]);

  // Handle re-subscribing if role changes
  useEffect(() => {
    if (permission === 'granted' && activeRole !== 'none') {
      setupPushSubscription();
    }
  }, [activeRole, permission]);

  const setupPushSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) return;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('[Notifications] VITE_VAPID_PUBLIC_KEY is missing in env. Push subscriptions disabled.');
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Sync subscription with Convex
      await saveSubscriptionMutation({
        deviceId,
        role: activeRole,
        subscription: JSON.parse(JSON.stringify(sub))
      });
      
      console.log('[Notifications] Push subscription registered and synced for role:', activeRole);
    } catch (err) {
      console.error('[Notifications] Error setting up push subscription:', err);
    }
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Las notificaciones del sistema no están soportadas en este navegador.');
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      setShowPrompt(false);

      if (res === 'granted') {
        console.log('[Notifications] Permission successfully granted by user.');
        await setupPushSubscription();
      }
    } catch (err) {
      console.error('[Notifications] Error requesting permission:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!showPrompt) {
    if (permission === 'default') {
      return (
        <button
          onClick={() => setShowPrompt(true)}
          className="fixed bottom-4 right-4 z-[90] bg-stone-900 text-white hover:bg-stone-850 font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs transition-all border border-stone-800 animate-bounce"
        >
          <Bell size={16} className="text-amber-400 animate-pulse" />
          Activar Avisos 🔔
        </button>
      );
    }
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-white rounded-3xl border border-stone-200 shadow-2xl p-5 space-y-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
          <Bell size={20} className="animate-bounce" />
        </div>
        <div className="space-y-1">
          <h4 className="font-serif font-bold text-sm text-stone-900">
            🔔 Activar notificaciones
          </h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            Necesitamos tu permiso para avisarte al instante cuando:
          </p>
          <ul className="text-[10px] text-stone-600 space-y-0.5 list-disc pl-4 font-sans">
            <li>Llegue un nuevo pedido o comanda anexa.</li>
            <li>Una comanda esté lista en cocina.</li>
            <li>El cliente solicite pagar la cuenta.</li>
            <li>Ocurran movimientos de servicio importantes.</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => setShowPrompt(false)}
          className="w-1/3 py-2 text-stone-500 hover:text-stone-850 font-bold text-xs text-center hover:bg-stone-100 rounded-xl"
        >
          Omitir
        </button>
        <button
          onClick={handleRequestPermission}
          disabled={isSubscribing}
          className="w-2/3 bg-stone-900 hover:bg-stone-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
        >
          {isSubscribing ? 'Activando...' : 'Activar Notificaciones'}
        </button>
      </div>
    </div>
  );
}
