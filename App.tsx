import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { getUserRole } from './services/sheetService';
import Login from './components/Login';
import ProcessingPage from './pages/Processing';
import InventoryPage from './pages/Inventory';
import FinancePage from './pages/Finance';
import ReceivingPage from './pages/Receiving';
import PackingPage from './pages/Packing';
import { Utensils, Package, ShoppingCart, DollarSign, LayoutDashboard, LogOut, LayoutGrid, Box } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('LOADING');
  const [currentView, setCurrentView] = useState<string>('DASHBOARD');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const r = await getUserRole();
        setRole(r);
        // Set default view based on role
        if (r === 'PROCESSING') setCurrentView('PROCESSING');
        else if (r === 'PACKING') setCurrentView('PACKING');
        else if (r === 'SALES') setCurrentView('SALES');
        else setCurrentView('DASHBOARD');
      } else {
        setRole('GUEST');
      }
    });
    return () => unsubscribe();
  }, []);

  if (!user) return <Login onLogin={() => {}} />;
  if (role === 'LOADING') return <div className="p-10 text-center flex items-center justify-center h-screen text-slate-400">Loading Access...</div>;

  if (role === 'GUEST') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold mb-2 text-slate-800">Access Pending</h1>
            <p className="text-slate-500 mb-4">Your ID: <code className="bg-slate-100 p-1 rounded text-sm font-mono">{user.uid}</code></p>
            <p className="mb-6 text-slate-600">Please ask an Admin to assign you the <b>PROCESSING</b>, <b>PACKING</b>, <b>SALES</b>, or <b>ADMIN</b> role in the database.</p>
            <button onClick={() => auth.signOut()} className="text-red-500 hover:text-red-700 font-bold underline">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <nav className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shadow-sm z-10">
        <h1 className="font-bold text-xl mb-6 px-2 text-slate-900 tracking-tight">ShroomTrack</h1>
        <div className="px-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{role} ACCESS</div>

        {/* PROCESSING STAFF MENU */}
        {(role === 'PROCESSING' || role === 'ADMIN') && (
          <>
            <button onClick={() => setCurrentView('RECEIVING')} className={`text-left p-3 rounded-lg font-bold flex items-center transition-colors ${currentView === 'RECEIVING' ? 'bg-earth-50 text-earth-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Package size={18} className="mr-3"/> Receiving Log
            </button>
            <button onClick={() => setCurrentView('PROCESSING')} className={`text-left p-3 rounded-lg font-bold flex items-center transition-colors ${currentView === 'PROCESSING' ? 'bg-earth-50 text-earth-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Utensils size={18} className="mr-3"/> Processing Floor
            </button>
          </>
        )}

        {/* PACKING MENU */}
        {(role === 'PACKING' || role === 'PROCESSING' || role === 'ADMIN') && (
           <button onClick={() => setCurrentView('PACKING')} className={`text-left p-3 rounded-lg font-bold flex items-center transition-colors ${currentView === 'PACKING' ? 'bg-earth-50 text-earth-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Box size={18} className="mr-3"/> Packing Station
           </button>
        )}

        {/* EVERYONE SEES INVENTORY */}
        <button onClick={() => setCurrentView('INVENTORY')} className={`text-left p-3 rounded-lg font-bold flex items-center transition-colors ${currentView === 'INVENTORY' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
           <LayoutGrid size={18} className="mr-3"/> Inventory
        </button>

        {/* SALES STAFF MENU */}
        {(role === 'SALES' || role === 'ADMIN') && (
           <button onClick={() => setCurrentView('SALES')} className={`text-left p-3 rounded-lg font-bold flex items-center transition-colors ${currentView === 'SALES' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ShoppingCart size={18} className="mr-3"/> Sales / POS
           </button>
        )}

        {/* ADMIN ONLY MENU */}
        {role === 'ADMIN' && (
           <button onClick={() => setCurrentView('FINANCE')} className={`text-left p-3 rounded-lg font-bold flex items-center transition-colors ${currentView === 'FINANCE' ? 'bg-slate-100 text-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <DollarSign size={18} className="mr-3"/> Full Finance
           </button>
        )}

        <button onClick={() => auth.signOut()} className="mt-auto text-left p-3 text-red-500 hover:bg-red-50 rounded-lg flex items-center font-bold transition-colors">
          <LogOut size={18} className="mr-3"/> Sign Out
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-6 relative">
        <div className="max-w-7xl mx-auto h-full">
            {currentView === 'PROCESSING' && <ProcessingPage />}
            {currentView === 'INVENTORY' && <InventoryPage />}
            {currentView === 'RECEIVING' && <ReceivingPage />}
            {currentView === 'PACKING' && <PackingPage />}

            {/* FINANCE VIEWS */}
            {currentView === 'SALES' && <FinancePage allowedTabs={['sales']} />}
            {currentView === 'FINANCE' && <FinancePage allowedTabs={['procurement', 'overview']} />}
            
            {currentView === 'DASHBOARD' && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <LayoutDashboard size={48} className="mb-4 opacity-50"/>
                    <h2 className="text-xl font-bold">Select a module from the sidebar</h2>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}