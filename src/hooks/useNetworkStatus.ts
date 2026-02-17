import { useState, useEffect } from 'react';

interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

function getInitialStatus(): NetworkStatus {
  if (!isBrowser) {
    return { online: true };
  }

  return {
    online: navigator.onLine,
    effectiveType: navigator.connection?.effectiveType,
    downlink: navigator.connection?.downlink,
    rtt: navigator.connection?.rtt,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(getInitialStatus);

  useEffect(() => {
    if (!isBrowser) return;

    const updateOnlineStatus = () => {
      setStatus((prev) => ({
        ...prev,
        online: navigator.onLine,
      }));
    };

    const updateConnectionStatus = () => {
      setStatus((prev) => ({
        ...prev,
        effectiveType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink,
        rtt: navigator.connection?.rtt,
      }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateConnectionStatus);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);

      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateConnectionStatus);
      }
    };
  }, []);

  return status;
}
