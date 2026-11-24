/** Apariencia de Projects: preferencia propia del producto (no afecta a Clinic, Retail, etc.). */
export const THEME_KEY = 'velatrix.projects.theme'

export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Automático' },
]

/**
 * Se ejecuta antes del primer render (sin parpadeo). Por defecto: Automático.
 * Va en línea con nonce (CSP); se mantiene mínimo y sin dependencias.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');if(p!=='light'&&p!=='dark')p='system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`

export function readPreference(): ThemePreference {
  try {
    const p = localStorage.getItem(THEME_KEY)
    return p === 'light' || p === 'dark' ? p : 'system'
  } catch {
    return 'system'
  }
}

export function applyPreference(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function savePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    // Sin almacenamiento (modo privado): se aplica igual durante la visita.
  }
  applyPreference(pref)
}
