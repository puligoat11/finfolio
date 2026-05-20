import { memo } from 'react';
import {
  LayoutDashboard, Briefcase, ArrowLeftRight, Star,
  Settings, ChevronLeft, ChevronRight, TrendingUp,
  DollarSign, CreditCard,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore, type NavItem } from '@/stores/uiStore';

interface NavItemConfig {
  id: NavItem;
  label: string;
  icon: typeof LayoutDashboard;
  section?: string;
}

const navItems: NavItemConfig[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, section: 'Investments' },
  { id: 'portfolio',  label: 'Portfolio',  icon: Briefcase },
  { id: 'trades',     label: 'Trades',     icon: ArrowLeftRight },
  { id: 'watchlist',  label: 'Watchlist',  icon: Star },
  { id: 'income',     label: 'Income',     icon: DollarSign,      section: 'Finances' },
  { id: 'expenses',   label: 'Expenses',   icon: CreditCard },
  { id: 'settings',   label: 'Settings',   icon: Settings,        section: 'Account' },
];

export const Sidebar = memo(function Sidebar() {
  const { sidebarCollapsed, currentNav, setNav, toggleSidebar } = useUIStore();

  let lastSection = '';

  return (
    <aside
      className={cn(
        'h-screen bg-dark-surface border-r border-dark-border flex flex-col transition-all duration-200 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-dark-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <span className="font-bold text-dark-text text-sm tracking-tight">FinFolio</span>
              <p className="text-[10px] text-dark-text-secondary leading-none">Portfolio Analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentNav === item.id;
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.id}>
              {showSection && !sidebarCollapsed && (
                <p className="text-[10px] font-semibold text-dark-text-secondary uppercase tracking-widest px-3 pt-4 pb-1.5">
                  {item.section}
                </p>
              )}
              {showSection && sidebarCollapsed && <div className="my-2 border-t border-dark-border/50" />}
              <button
                onClick={() => setNav(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                  'text-dark-text-secondary hover:text-dark-text hover:bg-dark-card',
                  isActive && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium'
                )}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-sm">{item.label}</span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-dark-border flex-shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-dark-text-secondary hover:text-dark-text hover:bg-dark-card transition-colors"
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
});
