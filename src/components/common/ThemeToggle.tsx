import React from 'react';
import { Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className }) => {
  const { isDark, toggleTheme, setTheme, savingTheme } = useTheme();

  if (variant === 'pill') {
    return (
      <div
        role="group"
        aria-label="Pilih tema tampilan"
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-pressed={!isDark}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
            !isDark
              ? 'bg-white text-pln-blue shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <Sun size={13} />
          Terang
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-pressed={isDark}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
            isDark
              ? 'bg-slate-900 text-cyan-400 shadow-sm border border-slate-700'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <Moon size={13} />
          Gelap
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
      aria-pressed={isDark}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      className={cn(
        'p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-amber-400 hover:text-pln-blue dark:hover:text-cyan-300 hover:shadow-md transition-all relative flex items-center justify-center',
        className
      )}
    >
      {savingTheme ? (
        <Loader2 size={18} className="animate-spin text-pln-blue dark:text-cyan-400" />
      ) : isDark ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
};

export default ThemeToggle;
