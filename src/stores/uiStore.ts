import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';
export type NavItem = 'dashboard' | 'portfolio' | 'trades' | 'watchlist' | 'income' | 'expenses' | 'settings';

interface UIState {
  theme: Theme;
  effectiveTheme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  currentNav: NavItem;
  chartPeriod: '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'MAX';

  isAddTradeOpen: boolean;
  isStockDetailOpen: boolean;
  selectedStockSymbol: string | null;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setNav: (nav: NavItem) => void;
  setChartPeriod: (period: '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'MAX') => void;
  openAddTrade: () => void;
  closeAddTrade: () => void;
  openStockDetail: (symbol: string) => void;
  closeStockDetail: () => void;
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      effectiveTheme: 'dark',
      sidebarCollapsed: false,
      currentNav: 'dashboard',
      chartPeriod: '1Y',
      isAddTradeOpen: false,
      isStockDetailOpen: false,
      selectedStockSymbol: null,

      setTheme: (theme) => {
        const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(effectiveTheme);
        set({ theme, effectiveTheme });
      },

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setNav: (nav) => set({ currentNav: nav }),
      setChartPeriod: (period) => set({ chartPeriod: period }),
      openAddTrade: () => set({ isAddTradeOpen: true }),
      closeAddTrade: () => set({ isAddTradeOpen: false }),
      openStockDetail: (symbol) => set({ isStockDetailOpen: true, selectedStockSymbol: symbol }),
      closeStockDetail: () => set({ isStockDetailOpen: false, selectedStockSymbol: null }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        chartPeriod: state.chartPeriod,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const effectiveTheme = state.theme === 'system' ? getSystemTheme() : state.theme;
          applyTheme(effectiveTheme);
          state.effectiveTheme = effectiveTheme;
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useUIStore.getState();
    if (theme === 'system') {
      const effectiveTheme = e.matches ? 'dark' : 'light';
      applyTheme(effectiveTheme);
      useUIStore.setState({ effectiveTheme });
    }
  });
}
