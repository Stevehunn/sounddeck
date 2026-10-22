/**
 * @file Network context + hook.
 *
 * The context is created here (no JSX) so the hook (`useNetwork`) and the
 * provider (`NetworkProvider`, in a sibling `.jsx` file) can be split
 * cleanly — required by React Fast Refresh.
 *
 * @see ./NetworkProvider.jsx — the actual provider
 * @see ./probeNetwork.js — the connectivity probe util
 */

import { createContext, useContext } from 'react'

/**
 * React context holding the current network state and the imperative
 * helpers (`showNoConnection`, `hideNoConnection`, `ensureOnline`,
 * `probeNetwork`).
 *
 * `null` means "not inside a `NetworkProvider`" — `useNetwork` throws in
 * that case.
 */
export const NetworkContext = createContext(null)

/**
 * Returns the network context from the nearest `NetworkProvider`.
 *
 * @throws {Error} If called outside a `NetworkProvider`.
 * @returns {{
 *   isOnline: boolean,
 *   showNoConnection: () => void,
 *   hideNoConnection: () => void,
 *   ensureOnline: () => Promise<boolean>,
 *   probeNetwork: () => Promise<boolean>,
 * }}
 */
export function useNetwork() {
  const ctx = useContext(NetworkContext)
  if (!ctx) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return ctx
}