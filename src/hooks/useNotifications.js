import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { messagingPromise, db, firebaseConfig } from '../firebase';
import { useAuth } from './useAuth';
import { logError } from '../utils/logError';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Pass the Firebase config to the service worker via its registration URL so it
// can init without a committed config file.
const SW_QS = new URLSearchParams({
  apiKey: firebaseConfig.apiKey || '',
  authDomain: firebaseConfig.authDomain || '',
  projectId: firebaseConfig.projectId || '',
  messagingSenderId: firebaseConfig.messagingSenderId || '',
  appId: firebaseConfig.appId || '',
}).toString();

const initialPermission = () =>
  typeof Notification !== 'undefined' ? Notification.permission : 'default';

export function useNotifications() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState(initialPermission);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    messagingPromise.then((m) => {
      if (mounted) setSupported(!!m && !!VAPID_KEY && 'Notification' in window);
    });
    return () => { mounted = false; };
  }, []);

  // Show foreground messages (data-only) as notifications too.
  useEffect(() => {
    let unsub;
    messagingPromise.then((m) => {
      if (!m) return;
      unsub = onMessage(m, (payload) => {
        const d = payload.data || {};
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        const title = d.title || 'Mundial 2026';
        const opts = { body: d.body || '', icon: '/icon-192.png' };
        try {
          new Notification(title, opts);
        } catch {
          // iOS PWAs don't support the Notification constructor — show it via
          // the service worker registration (created in enable()) instead.
          navigator.serviceWorker?.getRegistration()
            .then((reg) => reg?.showNotification(title, opts))
            .catch(() => { /* no registration — nothing to show */ });
        }
      });
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const enable = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const m = await messagingPromise;
      if (!m || !VAPID_KEY) { setBusy(false); return; }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setBusy(false); return; }

      const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${SW_QS}`);
      const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
      if (token) {
        await setDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) }, { merge: true });
      }
    } catch (e) {
      logError('NOTIF_ENABLE_FAILED', 'Falha ao ativar notificações', { e: String(e) });
    }
    setBusy(false);
  }, [user]);

  return { supported, permission, busy, enable };
}
