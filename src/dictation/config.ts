/**
 * Dictation stub flag.
 * - `EXPO_PUBLIC_DICTATION_STUB=1` → always use StubProvider
 * - `EXPO_PUBLIC_DICTATION_STUB=0` → UnavailableProvider (friendly “no engine yet”)
 * - unset → stub in `__DEV__`, unavailable otherwise
 */
export function isDictationStubEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_DICTATION_STUB;
  if (raw === '1') {
    return true;
  }
  if (raw === '0') {
    return false;
  }
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}
