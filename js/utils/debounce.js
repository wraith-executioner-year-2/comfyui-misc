/** @type {Map<Function, ReturnType<typeof setTimeout>>} */
const DEBOUNCE_FN_TO_TIMEOUT = new Map()

export function debounce(fn, ms = 64) {
  clearTimeout(DEBOUNCE_FN_TO_TIMEOUT.get(fn))
  const timeout = setTimeout(() => {
    DEBOUNCE_FN_TO_TIMEOUT.delete(fn)
    fn()
  }, ms)
  DEBOUNCE_FN_TO_TIMEOUT.set(fn, timeout)
  return timeout
}
