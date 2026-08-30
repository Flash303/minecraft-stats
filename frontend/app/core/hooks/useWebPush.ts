import { useState, useCallback } from "react";
import { fetchVapidKey, subscribeDevice, unsubscribeDevice } from "@/core/lib/api";
import { useToast } from "@/core/contexts/ToastContext";
import { useLanguage } from "@/core/contexts/LanguageContext";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function useWebPush(getToken: () => Promise<string | null>) {
    const { showToast } = useToast();
    const { t } = useLanguage();
    const isPushSupported = "serviceWorker" in navigator && "PushManager" in window;
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [checkingSubscription, setCheckingSubscription] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const checkSubscription = useCallback(async () => {
        if (!isPushSupported) {
            setCheckingSubscription(false);
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (e) {
            console.error("Error checking push subscription:", e);
        } finally {
            setCheckingSubscription(false);
        }
    }, [isPushSupported]);

    const handleSubscribe = async () => {
        if (!isPushSupported) return;
        setActionLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setActionLoading(false);
                return;
            }

            const vapidKey = await fetchVapidKey();
            if (!vapidKey) {
                showToast("error", t("push.vapidKeyError"));
                setActionLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!))))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!))))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const success = await subscribeDevice({
                endpoint: subscription.endpoint,
                p256dh,
                auth
            }, token);

            if (success) {
                setIsSubscribed(true);
                showToast("success", t("alerts.subscribeSuccess"));
            } else {
                showToast("error", t("push.syncError"));
            }
        } catch (e) {
            console.error("Push registration failed:", e);
            showToast("error", t("push.subscribeError"));
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!isPushSupported) return;
        setActionLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setActionLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                await unsubscribeDevice(subscription.endpoint, token);
                setIsSubscribed(false);
            }
        } catch (e) {
            console.error("Unsubscription failed:", e);
            showToast("error", t("push.unsubscribeError"));
        } finally {
            setActionLoading(false);
        }
    };

    return {
        isPushSupported,
        isSubscribed,
        checkingSubscription,
        actionLoading,
        checkSubscription,
        handleSubscribe,
        handleUnsubscribe
    };
}
