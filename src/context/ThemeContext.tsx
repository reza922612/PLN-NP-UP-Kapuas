import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';
import { useAuth } from './AuthContext';

const THEME_STORAGE_KEY = 'simap_theme_preference';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  savingTheme: boolean;
  setTheme: (nextTheme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  savingTheme: false,
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore storage access errors
  }
  return 'light';
};

const applyThemeToDom = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, updateUserProfile } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [savingTheme, setSavingTheme] = useState(false);

  // Sync DOM immediately whenever theme state changes
  useEffect(() => {
    applyThemeToDom(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  // Apply persisted user profile themePreference once authenticated profile loads
  useEffect(() => {
    const pref = profile?.themePreference;
    if (pref === 'light' || pref === 'dark') {
      setThemeState(pref);
    }
  }, [profile?.uid, profile?.themePreference]);

  const setTheme = useCallback(
    async (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      applyThemeToDom(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage write errors
      }

      if (user && profile) {
        setSavingTheme(true);
        try {
          await updateUserProfile({ themePreference: nextTheme });
        } catch (err) {
          console.error('Failed to persist themePreference to user profile:', err);
        } finally {
          setSavingTheme(false);
        }
      }
    },
    [user, profile, updateUserProfile]
  );

  const toggleTheme = useCallback(async () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        savingTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
