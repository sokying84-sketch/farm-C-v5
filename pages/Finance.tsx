import React, { useEffect, useState, useMemo } from 'react';
import { 
    getFinishedGoods, getInventory, getPurchaseOrders, createPurchaseOrder, 
    receivePurchaseOrder, complaintPurchaseOrder, resolveComplaint, getSuppliers, 
    addSupplier, deleteSupplier, addInventoryItem, getCustomers, addCustomer, 
    createSale, updateSaleStatus, getSales, getDailyProductionCosts, updateDailyCost, 
    getWeeklyRevenue, getLaborRate, setLaborRate, getRawMaterialRate, setRawMaterialRate,
    getMonthlyBudget, setMonthlyBudget 
} from '../services/sheetService';
import { InventoryItem, PurchaseOrder, Customer, FinishedGood, SalesRecord, DailyCostMetrics, Supplier, SalesStatus, Budget } from '../types';
import { ShoppingCart, AlertTriangle, CheckCircle2, Truck, Plus, Trash2, Building2, TrendingUp, PieChart, Store, FileText, Send, Printer, User, Pencil, Clock, Sprout, FileClock, PackageCheck, Receipt, Loader2, Target, ChevronDown, ChevronUp, X, Settings, ShoppingBag } from 'lucide-react';

interface FinanceProps {
  allowedTabs?: string[]; 
}

type DocumentType = 'QUOTATION' | 'INVOICE' | 'DO' | 'RECEIPT';

const FinancePage: React.FC<FinanceProps> = ({ allowedTabs = ['procurement', 'sales', 'overview'] }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'procurement' | 'sales'>(() => {
    if (allowedTabs.includes('procurement')) return 'procurement';
    if (allowedTabs.includes('sales')) return 'sales';
    return 'overview';
  });

  // Data States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [dailyCosts, setDailyCosts] = useState<DailyCostMetrics[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{date: string, amount: number}[]>([]);
  
  // BUDGET STATES
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [targetRevenue, setTargetRevenue] = useState('');
  const [targetProfit, setTargetProfit] = useState('');
  
  const [laborRate, setLaborRateState] = useState<number>(12.50);
  const [rawRate, setRawRateState] = useState<number>(8.00);
  
  // Modals & UI
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showQCModal, setShowQCModal] = useState<string | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState<string | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<SalesRecord | null>(null);
  const [viewDocType, setViewDocType] = useState<DocumentType>('INVOICE');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCostModal, setShowEditCostModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  
  // Forms
  const [poItem, setPoItem] = useState('');
  const [poQtyPackages, setPoQtyPackages] = useState('1');
  const [complaintReason, setComplaintReason] = useState('');
  const [editingCost, setEditingCost] = useState<DailyCostMetrics | null>(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', address: '', contact: '', itemName: '', itemType: 'PACKAGING', itemSubtype: 'POUCH', packSize: 100, unitCost: 45 });
  
  // UPDATED CUSTOMER FORM
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', email: '', contact: '', address: '', type: 'B2C', status: 'ACTIVE' });
  
  // SALES FORM
  const [salesCustomer, setSalesCustomer] = useState('');
  const [salesGood, setSalesGood] = useState('');
  const [salesQty, setSalesQty] = useState('1');
  const [salesPayment, setSalesPayment] = useState<'CASH' | 'COD' | 'CREDIT_CARD'>('CASH');
  const [salesPrice, setSalesPrice] = useState('15.00');
  
  // NEW CART STATE
  const [salesCart, setSalesCart] = useState<{id: string, label: string, qty: number, price: number}[]>([]);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  const refreshData = async () => {
    setLaborRateState(getLaborRate());
    setRawRateState(getRawMaterialRate());
    
    const [inv, po, sup, cust, goods, s, costs, rev] = await Promise.all([
        getInventory(), getPurchaseOrders(), getSuppliers(), getCustomers(), 
        getFinishedGoods(), getSales(), getDailyProductionCosts(), getWeeklyRevenue()
    ]);
    
    if (inv.success) setInventory(inv.data || []);
    if (po.success) setPurchaseOrders(po.data || []);
    if (sup.success) setSuppliers(sup.data || []);
    if (cust.success) setCustomers(cust.data || []);
    if (goods.success) setFinishedGoods(goods.data || []);
    if (s.success) setSales(s.data || []);
    if (costs.success) setDailyCosts(costs.data || []);
    setWeeklyRevenue(rev);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgetRes = await getMonthlyBudget(currentMonth);
    if (budgetRes.success && budgetRes.data) {
        setCurrentBudget(budgetRes.data);
        setTargetRevenue(budgetRes.data.targetRevenue.toString());
        setTargetProfit(budgetRes.data.targetProfit.toString());
    }
  };

  useEffect(() => { refreshData(); }, [activeTab]);

  const availableGoods = finishedGoods.reduce((acc, curr) => {
     if (curr.quantity <= 0) return acc;
     const key = `${curr.recipeName}|${curr.packagingType}`;
     if (!acc[key]) acc[key] = { key: key, id: curr.id, label: `${curr.recipeName} (${curr.packagingType})`, totalQty: 0, price: curr.sellingPrice || 15 };
     acc[key].totalQty += curr.quantity;
     return acc;
  }, {} as Record<string, { key: string, id: string, label: string, totalQty: number, price: number }>);

  useEffect(() => {
     if (salesGood && availableGoods[salesGood]) {
         setSalesPrice(availableGoods[salesGood].price.toFixed(2));
     }
  }, [salesGood, finishedGoods]);

  // --- AGGREGATION FOR DAILY LOG ---
  const aggregatedCosts = useMemo(() => {
      const map = new Map<string, DailyCostMetrics>();
      
      dailyCosts.forEach(cost => {
          const key = `${cost.date}|${cost.referenceId}`;
          if (!map.has(key)) {
              map.set(key, { ...cost });
          } else {
              const existing = map.get(key)!;
              existing.weightProcessed += cost.weightProcessed || 0;
              existing.processingHours += cost.processingHours || 0;
              existing.rawMaterialCost += cost.rawMaterialCost || 0;
              existing.packagingCost += cost.packagingCost || 0;
              existing.laborCost += cost.laborCost || 0;
              existing.wastageCost += cost.wastageCost || 0;
              existing.totalCost += cost.totalCost || 0;
          }
      });
      
      return Array.from(map.values()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyCosts]);

  // --- ACTIONS ---
  
  const handleAddToCart = () => {
      if (!salesGood) return;
      const product = availableGoods[salesGood];
      if (!product) return;
      
      const qty = parseInt(salesQty);
      if (qty <= 0) return;

      setSalesCart(prev => {
          const existing = prev.find(item => item.id === product.id);
          if (existing) {
              return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + qty } : item);
          }
          return [...prev, { id: product.id, label: product.label, qty, price: parseFloat(salesPrice) }];
      });
      setSalesGood(''); setSalesQty('1');
  };

  const handleRemoveFromCart = (index: number) => {
      setSalesCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateDocument = async (e: React.FormEvent, initialStatus: 'QUOTATION' | 'INVOICED') => {
    e.preventDefault();
    if (salesCart.length === 0) { alert("Cart is empty!"); return; }
    if (!salesCustomer) { alert("Please select a customer."); return; }

    const itemsToSell = salesCart.map(item => ({ finishedGoodId: item.id, quantity: item.qty, unitPrice: item.price }));
    const res = await createSale(salesCustomer, itemsToSell, salesPayment);
    
    if (res.success && res.data) {
        if (initialStatus === 'QUOTATION') {
            await updateSaleStatus(res.data.id, 'QUOTATION');
            res.data.status = 'QUOTATION';
            setViewDocType('QUOTATION');
        } else {
            setViewDocType('INVOICE');
        }
        setSelectedSale(res.data);
        setSalesCart([]);
        refreshData();
    } else { alert(res.message); }
  };

  const handleAddCustomer = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      await addCustomer({ 
          id: `cust-${Date.now()}`, 
          name: newCustomer.name || 'Unknown', 
          email: newCustomer.email || '', 
          contact: newCustomer.contact || '', 
          address: newCustomer.address || '',
          type: newCustomer.type || 'B2C',
          status: 'ACTIVE',
          joinDate: new Date().toISOString()
      } as Customer); 
      setShowCustomerModal(false); 
      setNewCustomer({ name: '', email: '', contact: '', address: '', type: 'B2C' });
      refreshData(); 
  };

  // RESTORED: Add Supplier Logic
  const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      const supRes = await addSupplier({ id: `sup-${Date.now()}`, name: newSupplier.name, address: newSupplier.address, contact: newSupplier.contact });
      
      if (supRes.success) {
          // Auto-add the primary item they supply
          await addInventoryItem({
              id: `inv-${Date.now()}`,
              name: newSupplier.itemName,
              type: newSupplier.itemType as any,
              subtype: newSupplier.itemSubtype as any,
              quantity: 0,
              threshold: 50,
              unit: 'units',
              unitCost: newSupplier.unitCost,
              supplier: newSupplier.name,
              packSize: newSupplier.packSize
          });
          
          setShowSupplierModal(false);
          setNewSupplier({ name: '', address: '', contact: '', itemName: '', itemType: 'PACKAGING', itemSubtype: 'POUCH', packSize: 100, unitCost: 45 });
          refreshData();
      }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
      e.preventDefault();
      const currentMonth = new Date().toISOString().slice(0, 7);
      await setMonthlyBudget({ id: currentMonth, month: currentMonth, targetRevenue: parseFloat(targetRevenue) || 0, targetProfit: parseFloat(targetProfit) || 0, maxWastageKg: 50 });
      setShowBudgetForm(false); refreshData();
  };
  const handleUpdateStatus = async (sale: SalesRecord, newStatus: string) => {
      if (newStatus === 'INVOICED' && !window.confirm("Convert Quotation to Invoice?")) return;
      setUpdatingId(sale.id);
      try {
          const res = await updateSaleStatus(sale.id, newStatus as SalesStatus);
          if (res.success && res.data) {
              await refreshData(); setSelectedSale(res.data);
              if (newStatus === 'INVOICED') setViewDocType('INVOICE');
              if (newStatus === 'SHIPPED') setViewDocType('DO');
              if (newStatus === 'PAID') setViewDocType('RECEIPT');
          }
      } finally { setUpdatingId(null); }
  };
  const handleSaveCostEdit = async (e: React.FormEvent) => { e.preventDefault(); if (editingCost && editingCost.id) { await updateDailyCost(editingCost.id, editingCost); setShowEditCostModal(false); setEditingCost(null); refreshData(); } };
  const handleCreatePO = async (e: React.FormEvent) => { e.preventDefault(); const item = inventory.find(i => i.id === poItem); if (!item) return; await createPurchaseOrder(item.id, parseInt(poQtyPackages), item.supplier || 'Generic'); setShowOrderModal(false); refreshData(); };
  
  // RESTORED: QC Logic
  const handleQC = async (passed: boolean) => { if (showQCModal) { if (passed) { await receivePurchaseOrder(showQCModal, true); setShowQCModal(null); } else { setShowComplaintModal(showQCModal); setShowQCModal(null); } refreshData(); } };
  const handleSubmitComplaint = async () => { if (showComplaintModal && complaintReason) { await complaintPurchaseOrder(showComplaintModal, complaintReason); setShowComplaintModal(null); setComplaintReason(''); refreshData(); } };
  const handleResolveComplaint = async (resolution: string) => { if (showResolutionModal) { await resolveComplaint(showResolutionModal, resolution); setShowResolutionModal(null); refreshData(); } };
  
  const handleDeleteSupplier = async (id: string) => { if (window.confirm("Remove?")) { await deleteSupplier(id); refreshData(); } };
  const handlePrint = () => setTimeout(() => alert("Printing..."), 500);
  const handleOpenDocument = (sale: SalesRecord, type: DocumentType) => { setSelectedSale(sale); setViewDocType(type); };
  const handleUpdateRate = () => { setLaborRate(laborRate); setShowRateModal(false); refreshData(); };
  const handleEditCostClick = (cost: DailyCostMetrics) => { setEditingCost({ ...cost }); setShowEditCostModal(true); };

  // Calculations
  const totalPackagingProcurement = purchaseOrders.filter(p => p.status === 'RECEIVED' || p.status === 'ORDERED').reduce((acc, p) => acc + p.totalCost, 0);
  const totalRawMaterialCost = dailyCosts.reduce((acc, d) => acc + d.rawMaterialCost, 0);
  const totalLaborCost = dailyCosts.reduce((acc, d) => acc + d.laborCost, 0);
  const totalWastageCost = dailyCosts.reduce((acc, d) => acc + d.wastageCost, 0);
  const totalOverallCost = totalPackagingProcurement + totalRawMaterialCost + totalLaborCost;
  const totalSalesRevenue = sales.filter(s => s.status === 'PAID' || s.status === 'DELIVERED').reduce((acc, s) => acc + s.totalAmount, 0);
  const netProfit = totalSalesRevenue - totalOverallCost;
  const avgCostPerUnit = finishedGoods.reduce((acc, i) => acc + i.quantity, 0) > 0 ? totalOverallCost / finishedGoods.reduce((acc, i) => acc + i.quantity, 0) : 0;
  const revenueProgress = currentBudget && currentBudget.targetRevenue > 0 ? (totalSalesRevenue / currentBudget.targetRevenue) * 100 : 0;
  const profitProgress = currentBudget && currentBudget.targetProfit > 0 ? (netProfit / currentBudget.targetProfit) * 100 : 0;
  const isRevenueRisk = (new Date().getDate() > 15) && revenueProgress < 50;
  const lowStockItems = inventory.filter(i => i.quantity < i.threshold);

  const createPieSlices = () => {
    let cumulativePercent = 0;
    const totalForPie = totalPackagingProcurement + totalRawMaterialCost + totalLaborCost + totalWastageCost;
    const data = [{ label: 'Raw Materials', pct: 0, color: '#15803d', cost: totalRawMaterialCost }, { label: 'Packaging', pct: 0, color: '#16a34a', cost: totalPackagingProcurement }, { label: 'Labor', pct: 0, color: '#3b82f6', cost: totalLaborCost }, { label: 'Wastage', pct: 0, color: '#ef4444', cost: totalWastageCost }];
    data.forEach(d => { d.pct = totalForPie > 0 ? (d.cost / totalForPie) * 100 : 0; });
    return data.filter(d => d.pct > 0).map((slice, i) => {
        const x = Math.cos(2 * Math.PI * cumulativePercent); const y = Math.sin(2 * Math.PI * cumulativePercent);
        cumulativePercent += slice.pct / 100;
        const x2 = Math.cos(2 * Math.PI * cumulativePercent); const y2 = Math.sin(2 * Math.PI * cumulativePercent);
        const largeArc = slice.pct / 100 > 0.5 ? 1 : 0;
        const pathData = slice.pct > 99.9 ? "M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0" : `M 0 0 L ${x} ${y} A 1 1 0 ${largeArc} 1 ${x2} ${y2} L 0 0`;
        return { ...slice, pathData, index: i };
    });
  };
  const slices = createPieSlices();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
         <h2 className="text-xl font-bold text-slate-800">Operations</h2>
         <div className="flex bg-slate-100 p-1 rounded-lg">
           {['procurement', 'sales', 'overview'].map(t => {
             if (!allowedTabs.includes(t)) return null; 
             return <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 capitalize rounded-md text-sm font-bold ${activeTab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{t}</button>
           })}
         </div>
      </div>

      {activeTab === 'procurement' && allowedTabs.includes('procurement') && (
        <div className="space-y-8 animate-in fade-in">
           {lowStockItems.length > 0 && (
             <div className="bg-red-50 border-2 border-red-200 p-6 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-500">
                <div className="flex items-start">
                  <div className="bg-red-100 p-3 rounded-full mr-4"><AlertTriangle className="text-red-600" size={32} /></div>
                  <div>
                    <h4 className="font-bold text-red-900 text-lg">URGENT: Low Stock Alert</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">{lowStockItems.map(i => (<li key={i.id} className="font-medium"><b>{i.name}</b>: {i.quantity} units left</li>))}</ul>
                  </div>
                </div>
                <button onClick={() => setShowOrderModal(true)} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md flex items-center whitespace-nowrap ml-4"><ShoppingCart size={20} className="mr-2"/> Reorder Now</button>
             </div>
           )}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                 <div className="flex justify-between items-center"><h3 className="font-bold text-slate-700">Active Orders</h3><div className="flex space-x-2"><button onClick={() => setShowSupplierModal(true)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold flex items-center hover:bg-slate-200"><Building2 size={18} className="mr-2"/> Manage Suppliers</button><button onClick={() => setShowOrderModal(true)} className="px-4 py-2 bg-earth-800 text-white rounded-lg font-bold flex items-center shadow-lg hover:bg-earth-900"><ShoppingCart size={18} className="mr-2"/> New Order</button></div></div>
                 {purchaseOrders.filter(p => p.status === 'ORDERED').map(po => (
                     <div key={po.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                        <div><div className="flex items-center space-x-2"><span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{po.supplier}</span><span className="text-xs text-slate-400">{new Date(po.dateOrdered).toLocaleDateString()}</span></div><h4 className="font-bold text-slate-800">{po.itemName}</h4><p className="text-sm text-slate-600">{po.quantity} packs • RM {po.totalCost.toFixed(2)}</p></div>
                        <button onClick={() => setShowQCModal(po.id)} className="px-3 py-2 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 shadow">Received</button>
                     </div>
                 ))}
              </div>
              <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-3">Supplier Directory</h3>
                     <div className="space-y-3 text-sm">{suppliers.map(s => (<div key={s.id} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 group"><div><p className="font-bold text-slate-700">{s.name}</p><p className="text-xs text-slate-500">{s.contact}</p></div><button onClick={() => handleDeleteSupplier(s.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button></div>))}</div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'sales' && allowedTabs.includes('sales') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
           {/* UPDATED: SALES POS UI */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Store className="mr-2"/> Point of Sale</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Customer</label>
                    <div className="flex space-x-2">
                        <select className="w-full p-3 border rounded-lg bg-slate-50" value={salesCustomer} onChange={e => setSalesCustomer(e.target.value)}>
                            <option value="">Select Customer...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setShowCustomerModal(true)} className="p-3 bg-nature-600 text-white rounded-lg hover:bg-nature-700"><Plus size={18}/></button>
                    </div>
                 </div>
                 
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                     <h4 className="text-xs font-bold text-slate-400 uppercase">Add Item</h4>
                     <div>
                        <select className="w-full p-2 border rounded-lg bg-white mb-2" value={salesGood} onChange={e => setSalesGood(e.target.value)}>
                            <option value="">Select Product...</option>
                            {Object.values(availableGoods).map((g: any) => (
                                <option key={g.key} value={g.key}>{g.label} (Stock: {g.totalQty})</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <input type="number" min="1" className="flex-1 p-2 border rounded-lg" value={salesQty} onChange={e => setSalesQty(e.target.value)} placeholder="Qty" />
                            <input 
                                type="number" 
                                step="0.01" 
                                className="flex-1 p-2 border rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" 
                                value={salesPrice} 
                                readOnly 
                                placeholder="Price" 
                                title="Price is managed in Inventory"
                            />
                            <button onClick={handleAddToCart} className="px-4 bg-earth-700 text-white rounded-lg font-bold hover:bg-earth-800">Add</button>
                        </div>
                     </div>
                 </div>

                 {/* CART DISPLAY */}
                 <div className="border-t border-b border-slate-100 py-2 max-h-40 overflow-y-auto">
                     {salesCart.length === 0 ? (
                         <p className="text-center text-slate-400 text-sm py-4">Cart is empty</p>
                     ) : (
                         salesCart.map((item, i) => (
                             <div key={i} className="flex justify-between items-center py-1 text-sm">
                                 <div>
                                     <span className="font-bold text-slate-700">{item.qty}x</span> {item.label}
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="font-mono">RM {(item.qty * item.price).toFixed(2)}</span>
                                     <button onClick={() => handleRemoveFromCart(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
                 
                 {salesCart.length > 0 && (
                     <div className="flex justify-between items-center font-bold text-lg text-slate-800">
                         <span>Total:</span>
                         <span>RM {salesCart.reduce((sum, i) => sum + (i.qty * i.price), 0).toFixed(2)}</span>
                     </div>
                 )}

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={(e) => handleCreateDocument(e, 'QUOTATION')} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Create Quote</button>
                    <button onClick={(e) => handleCreateDocument(e, 'INVOICED')} className="w-full py-3 bg-nature-600 text-white rounded-xl font-bold shadow-lg hover:bg-nature-700">Charge Invoice</button>
                 </div>
              </div>
           </div>
           
           <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-700 mb-2">Sales Ledger</h3>
              {sales.map(sale => (
                 <div key={sale.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-4 w-full md:w-auto">
                        <div className={`p-3 rounded-full flex-shrink-0 ${sale.status === 'QUOTATION' ? 'bg-purple-100 text-purple-600' : sale.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                           {sale.status === 'QUOTATION' ? <FileClock size={20}/> : sale.status === 'PAID' ? <CheckCircle2 size={20}/> : <FileText size={20}/>}
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                               <h4 className="font-bold text-slate-800">{sale.customerName}</h4>
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{sale.status}</span>
                           </div>
                           <p className="text-xs text-slate-500">RM {sale.totalAmount.toFixed(2)} • {sale.items.length} items</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        {sale.status === 'QUOTATION' && <button onClick={() => handleUpdateStatus(sale, 'INVOICED')} disabled={updatingId === sale.id} className="px-3 py-1.5 bg-nature-600 text-white text-xs font-bold rounded hover:bg-nature-700 flex items-center disabled:opacity-50">{updatingId === sale.id ? <Loader2 size={12} className="animate-spin mr-1"/> : null} Confirm & Invoice</button>}
                        {sale.status === 'INVOICED' && <button onClick={() => handleUpdateStatus(sale, 'SHIPPED')} disabled={updatingId === sale.id} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 flex items-center disabled:opacity-50">{updatingId === sale.id ? <Loader2 size={12} className="animate-spin mr-1"/> : null} Generate DO</button>}
                        {(sale.status === 'INVOICED' || sale.status === 'SHIPPED') && <button onClick={() => handleUpdateStatus(sale, 'PAID')} disabled={updatingId === sale.id} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex items-center disabled:opacity-50">{updatingId === sale.id ? <Loader2 size={12} className="animate-spin mr-1"/> : null} Mark Paid</button>}
                        <div className="flex border-l pl-2 ml-2 space-x-1">
                            {sale.status === 'QUOTATION' && <button onClick={() => handleOpenDocument(sale, 'QUOTATION')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><FileClock size={16}/></button>}
                            {sale.status !== 'QUOTATION' && <button onClick={() => handleOpenDocument(sale, 'INVOICE')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><FileText size={16}/></button>}
                            {(sale.status === 'SHIPPED' || sale.status === 'PAID') && <button onClick={() => handleOpenDocument(sale, 'DO')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><PackageCheck size={16}/></button>}
                            {sale.status === 'PAID' && <button onClick={() => handleOpenDocument(sale, 'RECEIPT')} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Receipt size={16}/></button>}
                        </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'overview' && allowedTabs.includes('overview') && (
         <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center cursor-pointer" onClick={() => setShowBudgetForm(!showBudgetForm)}>
                    <div className="flex items-center"><Target className="mr-2 text-green-400" /><div><h3 className="font-bold text-lg">Financial Planning</h3><p className="text-xs text-slate-400">Monthly Targets & Performance</p></div></div>
                    {showBudgetForm ? <ChevronUp /> : <ChevronDown />}
                </div>
                {showBudgetForm && (
                    <div className="p-6 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2">
                        <form onSubmit={handleSaveBudget} className="flex gap-4 items-end">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Target Revenue (RM)</label><input type="number" className="p-2 border rounded w-40" value={targetRevenue} onChange={e => setTargetRevenue(e.target.value)} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Target Profit (RM)</label><input type="number" className="p-2 border rounded w-40" value={targetProfit} onChange={e => setTargetProfit(e.target.value)} /></div>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Save Targets</button>
                        </form>
                    </div>
                )}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-600">Revenue Goal</span><span className="text-sm font-bold text-slate-800">RM {totalSalesRevenue.toFixed(0)} / <span className="text-slate-400">{currentBudget?.targetRevenue || '-'}</span></span></div>
                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className={`h-full transition-all duration-1000 ${isRevenueRisk ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(revenueProgress, 100)}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-600">Profit Goal</span><span className="text-sm font-bold text-slate-800">RM {netProfit.toFixed(0)} / <span className="text-slate-400">{currentBudget?.targetProfit || '-'}</span></span></div>
                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="h-full transition-all duration-1000 bg-blue-500" style={{ width: `${Math.min(profitProgress, 100)}%` }}></div></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase">Total Revenue</p><p className="text-2xl font-black text-green-700">RM {totalSalesRevenue.toFixed(2)}</p></div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase">Total Expenses</p><p className="text-2xl font-black text-red-700">RM {totalOverallCost.toFixed(2)}</p></div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase">Net Profit</p><p className={`text-2xl font-black ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>RM {netProfit.toFixed(2)}</p></div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase">Avg Cost/Unit</p><p className="text-2xl font-black text-slate-700">RM {avgCostPerUnit.toFixed(2)}</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                      <div className="w-full flex justify-between items-start mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center"><PieChart className="mr-2"/> Expense Distribution</h3><button onClick={() => setShowRateModal(true)} className="text-xs bg-slate-100 hover:bg-slate-200 p-2 rounded flex items-center"><Settings size={14} className="mr-1"/> Rates</button></div>
                      <div className="relative w-64 h-64">
                         <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full transform -rotate-90">
                            {slices.map((slice, i) => (<path key={i} d={slice.pathData} fill={slice.color} className="cursor-pointer transition-all hover:opacity-80" onMouseEnter={() => setHoveredPieIndex(i)} onMouseLeave={() => setHoveredPieIndex(null)} stroke="white" strokeWidth="0.02" />))}
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            {hoveredPieIndex !== null ? (<><span className="text-xs font-bold text-slate-400">{slices[hoveredPieIndex].label}</span><span className="text-2xl font-black text-slate-800">{slices[hoveredPieIndex].pct.toFixed(1)}%</span></>) : (<span className="text-xs font-bold text-slate-400">Total Exp.<br/>RM {totalOverallCost.toFixed(2)}</span>)}
                         </div>
                      </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Expense Details</h3>
                    <div className="space-y-4">
                        {slices.map((slice, i) => (<div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"><div className="flex items-center"><div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: slice.color }}></div><span className="text-sm font-bold text-slate-700">{slice.label}</span></div><div className="text-right"><p className="text-sm font-bold text-slate-800">RM {slice.cost.toFixed(2)}</p><p className="text-xs text-slate-400">{slice.pct.toFixed(1)}%</p></div></div>))}
                        <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center"><span className="text-sm font-bold text-slate-500">TOTAL EXPENSES</span><span className="text-xl font-black text-slate-800">RM {totalOverallCost.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center"><FileText className="mr-2 text-earth-600" /> Daily Production Cost Log</h3><span className="text-xs text-slate-400">Combined view per batch</span></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200"><tr><th className="p-3">Date</th><th className="p-3">Ref ID</th><th className="p-3">Activity</th><th className="p-3 text-right">Raw Mat.</th><th className="p-3 text-right">Packing</th><th className="p-3 text-right">Labor</th><th className="p-3 text-right">Wastage</th><th className="p-3 text-right">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {aggregatedCosts.map(cost => (
                                <tr key={cost.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-3 font-medium text-slate-700">{new Date(cost.date).toLocaleDateString()}</td>
                                    <td className="p-3 font-mono text-xs text-slate-500">{cost.referenceId || '-'}</td>
                                    <td className="p-3 text-xs text-slate-600">
                                        {cost.weightProcessed > 0 && <div>Proc: {cost.weightProcessed}kg</div>}
                                        {cost.processingHours > 0 && <div>Labor: {cost.processingHours.toFixed(2)}h</div>}
                                    </td>
                                    <td className="p-3 text-right">RM {cost.rawMaterialCost.toFixed(2)}</td>
                                    <td className="p-3 text-right">RM {cost.packagingCost.toFixed(2)}</td>
                                    <td className="p-3 text-right">RM {cost.laborCost.toFixed(2)}</td>
                                    <td className="p-3 text-right text-red-500">RM {cost.wastageCost.toFixed(2)}</td>
                                    <td className="p-3 text-right font-black text-slate-800">RM {cost.totalCost.toFixed(2)}</td>
                                </tr>
                            ))}
                            {dailyCosts.length === 0 && (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">No production activity recorded yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
         </div>
      )}

      {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                  <div className={`text-white p-8 flex justify-between items-start ${viewDocType === 'QUOTATION' ? 'bg-purple-700' : viewDocType === 'INVOICE' ? 'bg-slate-800' : viewDocType === 'DO' ? 'bg-blue-700' : 'bg-green-700'}`}>
                      <div><h2 className="text-4xl font-bold tracking-widest uppercase">{viewDocType === 'DO' ? 'DELIVERY ORDER' : viewDocType}</h2><p className="opacity-80 text-sm mt-1">#{selectedSale.invoiceId}</p></div>
                      <div className="text-right"><h3 className="font-bold text-xl">ShroomTrack ERP</h3><p className="opacity-80 text-sm mt-1">123 Industrial Park<br/>Kuala Lumpur</p></div>
                  </div>
                  <div className="overflow-y-auto flex-1 bg-white p-8">
                      <div className="flex justify-between mb-8">
                          <div><p className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</p><h4 className="text-2xl font-bold text-slate-800">{selectedSale.customerName}</h4><p className="text-slate-500">{selectedSale.customerEmail}</p></div>
                          <div className="text-right"><p className="text-slate-500">Date: {new Date(selectedSale.dateCreated).toLocaleDateString()}</p></div>
                      </div>
                      <table className="w-full text-left mb-8">
                          <thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
                          <tbody className="divide-y divide-slate-100">{selectedSale.items.map((item, i) => (<tr key={i}><td className="px-4 py-4"><p className="font-bold text-slate-800">{item.recipeName}</p><p className="text-xs text-slate-400">({item.packagingType})</p></td><td className="px-4 py-4 text-center font-bold">{item.quantity}</td><td className="px-4 py-4 text-right font-bold">RM {(item.quantity * item.unitPrice).toFixed(2)}</td></tr>))}</tbody>
                      </table>
                      <div className="flex justify-end border-t pt-4"><div className="text-right text-2xl font-bold"><span>Total: </span><span>RM {selectedSale.totalAmount.toFixed(2)}</span></div></div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between"><button onClick={() => setSelectedSale(null)} className="px-6 py-2 bg-white border font-bold rounded">Close</button><button onClick={handlePrint} className="px-6 py-2 bg-slate-800 text-white font-bold rounded">Print</button></div>
              </div>
          </div>
      )}

      {showEditCostModal && editingCost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold mb-4">Edit Cost Record</h3>
                  <p className="text-xs text-slate-500 mb-4">ID: {editingCost.id}</p>
                  <form onSubmit={handleSaveCostEdit} className="space-y-3">
                      <div><label className="text-xs font-bold">Raw Material Cost</label><input type="number" step="0.01" className="w-full p-2 border rounded" value={editingCost.rawMaterialCost} onChange={e => setEditingCost({...editingCost, rawMaterialCost: parseFloat(e.target.value)})} /></div>
                      <div><label className="text-xs font-bold">Packaging Cost</label><input type="number" step="0.01" className="w-full p-2 border rounded" value={editingCost.packagingCost} onChange={e => setEditingCost({...editingCost, packagingCost: parseFloat(e.target.value)})} /></div>
                      <div><label className="text-xs font-bold">Labor Cost</label><input type="number" step="0.01" className="w-full p-2 border rounded" value={editingCost.laborCost} onChange={e => setEditingCost({...editingCost, laborCost: parseFloat(e.target.value)})} /></div>
                      <div><label className="text-xs font-bold text-red-500">Wastage Cost</label><input type="number" step="0.01" className="w-full p-2 border rounded border-red-200" value={editingCost.wastageCost} onChange={e => setEditingCost({...editingCost, wastageCost: parseFloat(e.target.value)})} /></div>
                      <button className="w-full py-3 bg-blue-600 text-white font-bold rounded mt-2">Save Changes</button>
                  </form>
                  <button onClick={() => setShowEditCostModal(false)} className="w-full mt-2 text-sm text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      {showRateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold mb-4">Production Rates</h3>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 mb-1">Labor Rate (RM/Hour)</label><input type="number" step="0.50" className="w-full p-2 border rounded" value={laborRate} onChange={e => setLaborRateState(parseFloat(e.target.value))} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1">Raw Material (RM/Kg)</label><input type="number" step="0.50" className="w-full p-2 border rounded" value={rawRate} onChange={e => setRawRateState(parseFloat(e.target.value))} /></div>
                      <button onClick={handleUpdateRate} className="w-full py-3 bg-earth-800 text-white font-bold rounded">Update Rates</button>
                  </div>
                  <button onClick={() => setShowRateModal(false)} className="w-full mt-3 text-sm text-slate-500">Cancel</button>
              </div>
          </div>
      )}
      
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center"><ShoppingCart className="mr-2 text-earth-600"/> New Purchase Order</h3>
                <form onSubmit={handleCreatePO} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Select Item</label>
                        <select className="w-full p-3 border rounded-lg bg-white" value={poItem} onChange={e => setPoItem(e.target.value)} required>
                            <option value="">Select Item...</option>
                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.supplier})</option>)}
                        </select>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Quantity (Packs)</label>
                        <input type="number" min="1" className="w-full p-3 border rounded-lg" value={poQtyPackages} onChange={e => setPoQtyPackages(e.target.value)} required placeholder="Quantity" />
                        
                        {/* DYNAMIC PACK INFO */}
                        {poItem && (() => {
                            const item = inventory.find(i => i.id === poItem);
                            if (item) {
                                const totalUnits = parseInt(poQtyPackages || '0') * (item.packSize || 1);
                                return (
                                    <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded mt-1">
                                        1 Pack = {item.packSize || 1} {item.unit}. <span className="font-bold text-slate-700">Total: {totalUnits} {item.unit}</span>.
                                    </p>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowOrderModal(false)} className="flex-1 py-3 text-slate-500 bg-slate-100 rounded-lg font-bold hover:bg-slate-200">Cancel</button>
                        <button type="submit" className="flex-1 py-3 bg-earth-800 text-white rounded-lg font-bold shadow-lg hover:bg-earth-900">Place Order</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <h3 className="font-bold text-lg mb-4">Add Customer</h3>
                  <form onSubmit={handleAddCustomer} className="space-y-3">
                      <input placeholder="Name" className="w-full p-2 border rounded" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                      <input placeholder="Email" className="w-full p-2 border rounded" required value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                      <input placeholder="Phone" className="w-full p-2 border rounded" value={newCustomer.contact} onChange={e => setNewCustomer({...newCustomer, contact: e.target.value})} />
                      <input placeholder="Address" className="w-full p-2 border rounded" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                      
                      <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => setNewCustomer({...newCustomer, type: 'B2C'})} className={`flex-1 p-2 rounded border text-sm font-bold ${newCustomer.type === 'B2C' ? 'bg-green-100 border-green-300 text-green-700' : 'border-slate-200 text-slate-500'}`}>Individual (B2C)</button>
                          <button type="button" onClick={() => setNewCustomer({...newCustomer, type: 'B2B'})} className={`flex-1 p-2 rounded border text-sm font-bold ${newCustomer.type === 'B2B' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500'}`}>Business (B2B)</button>
                      </div>

                      <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg mt-2">Save Customer</button>
                  </form>
                  <button onClick={() => setShowCustomerModal(false)} className="mt-3 w-full text-sm text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      {/* RESTORED: SUPPLIER MODAL */}
      {showSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <h3 className="font-bold text-lg mb-4 flex items-center"><Building2 className="mr-2 text-earth-600"/> Manage Suppliers</h3>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Add New Supplier & Item</h4>
                  <form onSubmit={handleAddSupplier} className="space-y-3">
                      <input placeholder="Supplier Name" className="w-full p-2 border rounded" required value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                      <input placeholder="Contact (Email/Phone)" className="w-full p-2 border rounded" value={newSupplier.contact} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})} />
                      <input placeholder="Address" className="w-full p-2 border rounded" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                      
                      <div className="pt-2 border-t border-slate-100">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Primary Item Supplied</label>
                          <input placeholder="Item Name (e.g. Red Pouch)" className="w-full p-2 border rounded mb-2" required value={newSupplier.itemName} onChange={e => setNewSupplier({...newSupplier, itemName: e.target.value})} />
                          <div className="grid grid-cols-2 gap-2 mb-2">
                              <select className="w-full p-2 border rounded" value={newSupplier.itemType} onChange={e => setNewSupplier({...newSupplier, itemType: e.target.value})}>
                                  <option value="PACKAGING">Packaging</option>
                                  <option value="RAW_MATERIAL">Raw Material</option>
                                  <option value="LABEL">Label</option>
                              </select>
                              <select className="w-full p-2 border rounded" value={newSupplier.itemSubtype} onChange={e => setNewSupplier({...newSupplier, itemSubtype: e.target.value})}>
                                  <option value="POUCH">Pouch</option>
                                  <option value="TIN">Tin</option>
                                  <option value="STICKER">Sticker</option>
                              </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <input type="number" placeholder="Pack Size" className="w-full p-2 border rounded" value={newSupplier.packSize} onChange={e => setNewSupplier({...newSupplier, packSize: parseFloat(e.target.value)})} />
                              <input type="number" placeholder="Cost (RM)" className="w-full p-2 border rounded" value={newSupplier.unitCost} onChange={e => setNewSupplier({...newSupplier, unitCost: parseFloat(e.target.value)})} />
                          </div>
                      </div>

                      <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg mt-2">Register Supplier & Item</button>
                  </form>
                  <button onClick={() => setShowSupplierModal(false)} className="mt-3 w-full text-sm text-slate-500">Close</button>
              </div>
          </div>
      )}

      {/* RESTORED: QC / RECEIVING MODAL */}
      {showQCModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
                  <h3 className="font-bold text-lg mb-2">Quality Check</h3>
                  <p className="text-slate-500 mb-6">Did the shipment arrive in good condition?</p>
                  <div className="flex gap-3">
                      <button onClick={() => handleQC(false)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-lg border border-red-100 hover:bg-red-100">Issues Found</button>
                      <button onClick={() => handleQC(true)} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">All Good</button>
                  </div>
              </div>
          </div>
      )}

      {/* RESTORED: COMPLAINT MODAL */}
      {showComplaintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <h3 className="font-bold text-lg mb-4 text-red-600 flex items-center"><AlertTriangle className="mr-2"/> Report Issue</h3>
                  <textarea 
                      className="w-full h-32 p-3 border rounded-lg mb-4" 
                      placeholder="Describe damage, missing items, or quality issues..."
                      value={complaintReason}
                      onChange={e => setComplaintReason(e.target.value)}
                  ></textarea>
                  <button onClick={handleSubmitComplaint} className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Submit Complaint</button>
                  <button onClick={() => setShowComplaintModal(null)} className="mt-3 w-full text-sm text-slate-500">Cancel</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default FinancePage;