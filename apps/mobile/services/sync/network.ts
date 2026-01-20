/**
 * Network Detection
 * Monitors network state and triggers sync when connectivity changes
 */

import { getSyncEngine } from './engine';

// Network state types
export type NetworkState = 'online' | 'offline' | 'unknown';

// Track current state
let currentNetworkState: NetworkState = 'unknown';
let networkListeners: ((state: NetworkState) => void)[] = [];

/**
 * Initialize network monitoring
 * Uses @react-native-community/netinfo when available
 */
export async function initializeNetworkMonitoring(): Promise<void> {
  try {
    // Dynamically import netinfo to avoid issues when not installed
    const NetInfo = await import('@react-native-community/netinfo').catch(() => null);

    if (NetInfo) {
      // Subscribe to network state changes
      NetInfo.default.addEventListener((state) => {
        const isConnected = state.isConnected ?? false;
        const newState: NetworkState = isConnected ? 'online' : 'offline';

        if (newState !== currentNetworkState) {
          currentNetworkState = newState;
          notifyNetworkListeners(newState);

          // Update sync engine
          const engine = getSyncEngine();
          engine.setOnline(isConnected);
        }
      });

      // Get initial state
      const initialState = await NetInfo.default.fetch();
      currentNetworkState = initialState.isConnected ? 'online' : 'offline';
      getSyncEngine().setOnline(initialState.isConnected ?? true);
    } else {
      // Fallback for web or when netinfo is not available
      console.log('NetInfo not available, assuming online');
      currentNetworkState = 'online';

      // Use window.navigator.onLine for web
      if (typeof window !== 'undefined' && 'onLine' in navigator) {
        currentNetworkState = navigator.onLine ? 'online' : 'offline';

        window.addEventListener('online', () => {
          currentNetworkState = 'online';
          notifyNetworkListeners('online');
          getSyncEngine().setOnline(true);
        });

        window.addEventListener('offline', () => {
          currentNetworkState = 'offline';
          notifyNetworkListeners('offline');
          getSyncEngine().setOnline(false);
        });
      }
    }
  } catch (error) {
    console.error('Failed to initialize network monitoring:', error);
    // Default to online
    currentNetworkState = 'online';
  }
}

/**
 * Get current network state
 */
export function getNetworkState(): NetworkState {
  return currentNetworkState;
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return currentNetworkState === 'online';
}

/**
 * Subscribe to network state changes
 */
export function subscribeToNetworkChanges(
  listener: (state: NetworkState) => void
): () => void {
  networkListeners.push(listener);
  return () => {
    networkListeners = networkListeners.filter((l) => l !== listener);
  };
}

/**
 * Notify all network listeners
 */
function notifyNetworkListeners(state: NetworkState): void {
  networkListeners.forEach((listener) => listener(state));
}

/**
 * Manually check network connectivity
 * Useful for retry scenarios
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const NetInfo = await import('@react-native-community/netinfo').catch(() => null);

    if (NetInfo) {
      const state = await NetInfo.default.fetch();
      return state.isConnected ?? false;
    }

    // Fallback for web
    if (typeof window !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }

    return true;
  } catch {
    return true;
  }
}
