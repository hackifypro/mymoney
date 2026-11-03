import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { MobileNav } from './components/common/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { HomeSection } from './components/home/HomeSection';
import { RoomSection } from './components/room/RoomSection';
import { OtherSection } from './components/other/OtherSection';
import { PeopleSection } from './components/people/PeopleSection';
import { ReportsSection } from './components/reports/ReportsSection';
import { AllTransactionsSection } from './components/all-transactions/AllTransactionsSection';
import { RecycleBinSection } from './components/recycle-bin/RecycleBinSection';
import { DynamicCustomSection } from './components/dynamic/DynamicCustomSection';
import { MaintenanceScreen } from './components/maintenance/MaintenanceScreen';
import { SettingsSection } from './components/settings/SettingsSection';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { AuthPage } from './components/auth/AuthPage';
import { TransactionCategory, TransactionSubcategory } from './types';
import { Wallet, AlertTriangle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const { maintenanceSettings, dynamicSections, refreshTransactions } = useExpense();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialCategory, setModalInitialCategory] = useState<TransactionCategory>('home');
  const [modalInitialSubcategory, setModalInitialSubcategory] = useState<TransactionSubcategory | undefined>(undefined);
  const [modalInitialPerson, setModalInitialPerson] = useState<string | undefined>(undefined);

  const handleOpenAddModal = (
    category: TransactionCategory = 'home',
    subcategory?: TransactionSubcategory,
    personName?: string
  ) => {
    setModalInitialCategory(category);
    setModalInitialSubcategory(subcategory);
    setModalInitialPerson(personName);
    setIsAddModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <img
          src="/logo.jpg"
          alt="My Money Manager by HackifyPro"
          className="w-16 h-16 rounded-2xl object-cover shadow-2xl shadow-emerald-500/20 border-2 border-emerald-500/40 animate-pulse"
        />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-4 tracking-wider uppercase">
          Loading My Money Manager...
        </p>
      </div>
    );
  }

  // If user is not logged in, render AuthPage (Login & Register)
  if (!user) {
    return <AuthPage />;
  }

  // MAINTENANCE MODE ENFORCEMENT:
  // If maintenance mode is enabled and user is NOT an admin, block access with MaintenanceScreen
  if (maintenanceSettings.isEnabled && !isAdmin) {
    return (
      <MaintenanceScreen
        settings={maintenanceSettings}
        onRefresh={refreshTransactions}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Admin Maintenance Mode Banner */}
      {maintenanceSettings.isEnabled && isAdmin && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black flex items-center justify-between border-b border-amber-600 shadow-sm animate-pulse z-50">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              MAINTENANCE MODE ACTIVE: Normal users are blocked. You are browsing with Admin Bypass privilege.
            </span>
            <button
              onClick={() => setCurrentTab('admin')}
              className="ml-auto underline font-bold cursor-pointer hover:text-black shrink-0"
            >
              Admin Control Panel &rarr;
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar for Desktop */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAddModal={() => handleOpenAddModal(currentTab === 'all_transactions' ? 'home' : (currentTab as any))}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Navbar */}
          <Navbar
            currentTab={currentTab}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenAddModal={() => handleOpenAddModal(currentTab === 'all_transactions' ? 'home' : (currentTab as any))}
            onSelectTab={setCurrentTab}
          />

          {/* Dynamic Section Views */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentTab}
                onOpenAddModal={handleOpenAddModal}
              />
            )}

            {currentTab === 'home' && (
              <HomeSection onOpenAddModal={handleOpenAddModal} />
            )}

            {currentTab === 'room' && (
              <RoomSection onOpenAddModal={handleOpenAddModal} />
            )}

            {currentTab === 'other' && (
              <OtherSection onOpenAddModal={handleOpenAddModal} />
            )}

            {currentTab === 'people' && (
              <PeopleSection onOpenAddModal={handleOpenAddModal} />
            )}

            {currentTab === 'reports' && (
              <ReportsSection />
            )}

            {currentTab === 'all_transactions' && (
              <AllTransactionsSection onOpenAddModal={handleOpenAddModal} />
            )}

            {currentTab === 'recycle_bin' && (
              <RecycleBinSection />
            )}

            {/* Custom Dynamic Sections */}
            {dynamicSections.some((s) => s.id === currentTab && !['home', 'room', 'other', 'people'].includes(s.id)) && (
              <DynamicCustomSection
                section={dynamicSections.find((s) => s.id === currentTab)!}
                onOpenAddModal={handleOpenAddModal}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsSection />
            )}

            {currentTab === 'admin' && (
              <AdminDashboard />
            )}
          </main>
        </div>

        {/* Mobile Drawer & Bottom Navigation */}
        <MobileNav
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAddModal={() => handleOpenAddModal(currentTab === 'all_transactions' ? 'home' : (currentTab as any))}
        />

        {/* Universal Add Transaction Modal */}
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          initialCategory={modalInitialCategory}
          initialSubcategory={modalInitialSubcategory}
          initialPersonName={modalInitialPerson}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ExpenseProvider>
            <MainContent />
          </ExpenseProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
