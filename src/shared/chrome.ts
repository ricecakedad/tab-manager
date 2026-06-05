export type ChromeApi = typeof chrome

export function getChromeApi(): ChromeApi | undefined {
  if ('chrome' in globalThis) {
    return globalThis.chrome as ChromeApi
  }

  return undefined
}
