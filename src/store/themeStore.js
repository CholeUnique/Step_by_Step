import { create } from 'zustand'
import { themes } from '../themes.js'

const useThemeStore = create((set) => ({
  themeId: 'cupertino',
  theme: themes.cupertino,

  cycleTheme() {
    set(state => {
      const keys = Object.keys(themes)
      const idx = keys.indexOf(state.themeId)
      const next = keys[(idx + 1) % keys.length]
      return { themeId: next, theme: themes[next] }
    })
  },
}))

export default useThemeStore
