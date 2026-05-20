import { useState } from 'react';
import { Moon, Sun, Monitor, RefreshCw, Database, Download, Upload, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { useQuotesStore } from '@/stores/quotesStore';
import { cn } from '@/utils/cn';

const ThemeOption = ({
  theme,
  label,
  icon: Icon,
  currentTheme,
  onSelect,
}: {
  theme: Theme;
  label: string;
  icon: typeof Moon;
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
}) => {
  const isSelected = currentTheme === theme;

  return (
    <button
      onClick={() => onSelect(theme)}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border transition-colors',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-dark-border hover:border-dark-text-secondary'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          isSelected ? 'bg-primary text-white' : 'bg-dark-surface text-dark-text-secondary'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-left">
        <p className={cn('font-medium', isSelected ? 'text-primary' : 'text-dark-text')}>
          {label}
        </p>
        <p className="text-xs text-dark-text-secondary">
          {theme === 'system' ? 'Match system preference' : `Always use ${theme} mode`}
        </p>
      </div>
    </button>
  );
};

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const { refreshInterval, autoRefreshEnabled, setRefreshInterval, setAutoRefresh } =
    useQuotesStore();

  const [refreshSeconds, setRefreshSeconds] = useState(Math.floor(refreshInterval / 1000));

  const handleRefreshIntervalChange = (value: number) => {
    setRefreshSeconds(value);
    setRefreshInterval(value * 1000);
  };

  const handleExportData = () => {
    const data = localStorage.getItem('stock_portfolio_db');
    if (data) {
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.db`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const data = reader.result as string;
          localStorage.setItem('stock_portfolio_db', data);
          window.location.reload();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.removeItem('stock_portfolio_db');
      window.location.reload();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Settings</h1>
        <p className="text-dark-text-secondary mt-1">Customize your portfolio experience</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption
              theme="dark"
              label="Dark"
              icon={Moon}
              currentTheme={theme}
              onSelect={setTheme}
            />
            <ThemeOption
              theme="light"
              label="Light"
              icon={Sun}
              currentTheme={theme}
              onSelect={setTheme}
            />
            <ThemeOption
              theme="system"
              label="System"
              icon={Monitor}
              currentTheme={theme}
              onSelect={setTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Refresh */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Data Refresh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-dark-text">Auto-refresh quotes</p>
              <p className="text-sm text-dark-text-secondary">
                Automatically update stock prices during market hours
              </p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefreshEnabled)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                autoRefreshEnabled ? 'bg-primary' : 'bg-dark-border'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                  autoRefreshEnabled ? 'translate-x-6' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              Refresh interval (seconds)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={refreshSeconds}
                onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                className="flex-1"
                disabled={!autoRefreshEnabled}
              />
              <span className="w-12 text-right text-dark-text">{refreshSeconds}s</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-dark-text-secondary">
            Your portfolio data is stored locally in your browser. You can export it for
            backup or import from a previous backup.
          </p>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="secondary" onClick={handleImportData}>
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>

          <div className="pt-4 border-t border-dark-border">
            <Button variant="danger" onClick={handleClearData}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-dark-text-secondary mt-2">
              This will permanently delete all your positions, trades, and watchlist items.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-dark-text-secondary">
            Stock Portfolio Local v1.0.0
          </p>
          <p className="text-sm text-dark-text-secondary mt-1">
            A local-only, high-performance portfolio tracker. All data is stored on your
            device.
          </p>
          <p className="text-xs text-dark-text-secondary/70 mt-3">
            Stock data provided by Yahoo Finance. Prices may be delayed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
