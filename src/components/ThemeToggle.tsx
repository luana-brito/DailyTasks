import { useEffect, useState } from 'react'
import { IconSun, IconMoon } from './Icons'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pwa-daily-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  
  return 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
    </button>
  )
}

export function useThemeInit() {
  useEffect(() => {
    const theme = getInitialTheme()
    document.documentElement.setAttribute('data-theme', theme)
  }, [])
}
