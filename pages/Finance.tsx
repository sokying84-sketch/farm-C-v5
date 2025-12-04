import React, { useEffect, useState } from 'react';
import { getFinishedGoods, getInventory, getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, complaintPurchaseOrder, resolveComplaint, getSuppliers, addSupplier, deleteSupplier, addInventoryItem, getCustomers, addCustomer, createSale, updateSaleStatus, getSales, getDailyProductionCosts, updateDailyCost, getWeeklyRevenue, getLaborRate, setLaborRate, getRawMaterialRate, setRawMaterialRate } from '../services/sheetService';
import { InventoryItem, PurchaseOrder, Customer, FinishedGood, SalesRecord, DailyCostMetrics, Supplier, SalesStatus } from '../types';
import { ShoppingCart, AlertTriangle, CheckCircle2, Truck, Plus, Trash2, Building2, TrendingUp, PieChart, Store, FileText, Send, Printer, User, Pencil, Clock, Sprout, FileClock, PackageCheck, Receipt, Loader2 } from 'lucide-react';

interface FinanceProps {
  allowedTabs?: string[]; 
}

// New Type for controlling which document we are viewing
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
  
  const [laborRate, setLaborRateState] = useState<number>(12.50);
  const [rawRate, setRawRateState] = useState<number>(8.00);
  
  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showQCModal, setShowQCModal] = useState<string | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState<string | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState<string | null>(null);
  
  // DOCUMENT VIEWER MODAL STATE
  const [selectedSale, setSelectedSale] = useState<SalesRecord | null>(null);
  const [viewDocType, setViewDocType] = useState<DocumentType>('INVOICE');

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showRawRateModal, setShowRawRateModal] = useState(false);
  const [showEditCostModal, setShowEditCostModal] = useState(false);

  // Forms
  const [poItem, setPoItem] = useState('');
  const [poQtyPackages, setPoQtyPackages] = useState('1');
  const [complaintReason, setComplaintReason] = useState('');
  const [editingCost, setEditingCost] = useState<DailyCostMetrics | null>(null);

  // Supplier Form
  const [newSupplier, setNewSupplier] = useState({ 
    name: '', address: '', contact: '', itemName: '', itemType: 'PACKAGING', itemSubtype: 'POUCH', packSize: 100, unitCost: 45 
  });

  // Customer Form
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', contact: '', address: '' });

  // SALES FORM STATE
  const [salesCustomer, setSalesCustomer] = useState('');
  const [salesGood, setSalesGood] = useState('');
  const [salesQty, setSalesQty] = useState('1');
  const [salesPayment, setSalesPayment] = useState<'CASH' | 'COD' | 'CREDIT_CARD'>('CASH');
  const [salesPrice, setSalesPrice] = useState('15.00');
  
  // UX States
  const [isSending, setIsSending] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refreshData = async () => {
    setLaborRateState(getLaborRate());
    setRawRateState(getRawMaterialRate());
    const [inv, po, sup, cust, goods, s, costs, rev] = await Promise.all([getInventory(), getPurchaseOrders(), getSuppliers(), getCustomers(), getFinishedGoods(), getSales(), getDailyProductionCosts(), getWeeklyRevenue()]);
    if (inv.success) setInventory(inv.data || []);
    if (po.success) setPurchaseOrders(po.data || []);
    if (sup.success) setSuppliers(sup.data || []);
    if (cust.success) setCustomers(cust.data || []);
    if (goods.success) setFinishedGoods(goods.data || []);
    if (s.success) setSales(s.data || []);
    if (costs.success) setDailyCosts(costs.data || []);
    setWeeklyRevenue(rev);
  };

  useEffect(() => { refreshData(); }, [activeTab]);

  // Aggregation for Sales Dropdown
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

  // --- SALES WORKFLOW FUNCTIONS ---

  const handleCreateDocument = async (e: React.FormEvent, initialStatus: 'QUOTATION' | 'INVOICED') => {
    e.preventDefault();
    if (!salesGood || !salesCustomer) {
        alert("Please select customer and product.");
        return;
    }
    const productInfo = availableGoods[salesGood];
    if (!productInfo) return;

    // Create the Sale Record
    const res = await createSale(salesCustomer, productInfo.id, parseInt(salesQty), parseFloat(salesPrice), salesPayment);
    
    if (res.success && res.data) {
        // If we want it to be a Quotation initially, we might need to update the status immediately
        if (initialStatus === 'QUOTATION') {
            await updateSaleStatus(res.data.id, 'QUOTATION');
            res.data.status = 'QUOTATION'; // Update local obj for modal
            setViewDocType('QUOTATION');
        } else {
            setViewDocType('INVOICE');
        }

        setSelectedSale(res.data);
        setSalesGood(''); setSalesQty('1');
        refreshData();
    }
  };

  const handleUpdateStatus = async (sale: SalesRecord, newStatus: string) => {
      // 1. Confirm Action
      if (newStatus === 'INVOICED' && !window.confirm("Convert Quotation to Official Invoice? Stock will be reserved.")) return;
      if (newStatus === 'SHIPPED' && !window.confirm("Generate Delivery Order?")) return;
      
      setUpdatingId(sale.id);
      
      try {
          const res = await updateSaleStatus(sale.id, newStatus as SalesStatus);
          if (res.success && res.data) {
              await refreshData(); // Await refresh to ensure UI sync
              setSelectedSale(res.data); // Update modal view
              
              // Auto-switch document view based on status change
              if (newStatus === 'INVOICED') setViewDocType('INVOICE');
              if (newStatus === 'SHIPPED') setViewDocType('DO');
              if (newStatus === 'PAID') setViewDocType('RECEIPT');
          } else {
              alert("Error: " + res.message);
          }
      } catch (e: any) {
          alert("Update failed: " + e.message);
      } finally {
          setUpdatingId(null);
      }
  };

  const handleOpenDocument = (sale: SalesRecord, type: DocumentType) => {
      setSelectedSale(sale);
      setViewDocType(type);
  };

  // --- STANDARD FUNCTIONS (Keep existing logic) ---
  const handleUpdateRate = () => { setLaborRate(laborRate); setShowRateModal(false); refreshData(); };
  const handleUpdateRawRate = () => { setRawMaterialRate(rawRate); setShowRawRateModal(false); refreshData(); };
  const handleSaveCostEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCost && editingCost.id) {
      await updateDailyCost(editingCost.id, editingCost);
      setShowEditCostModal(false); setEditingCost(null); refreshData();
    }
  };
  const handleEditCostClick = (cost: DailyCostMetrics) => { setEditingCost({ ...cost }); setShowEditCostModal(true); };
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === poItem);
    if (!item) return;
    await createPurchaseOrder(item.id, parseInt(poQtyPackages), item.supplier || 'Generic Supplier');
    setShowOrderModal(false); refreshData();
  };
  const handleQC = async (passed: boolean) => {
     if (showQCModal) {
         if (passed) { await receivePurchaseOrder(showQCModal, true); setShowQCModal(null); } 
         else { setShowComplaintModal(showQCModal); setShowQCModal(null); }
         refreshData();
     }
  };
  const handleSubmitComplaint = async () => {
      if (showComplaintModal && complaintReason) { await complaintPurchaseOrder(showComplaintModal, complaintReason); setShowComplaintModal(null); setComplaintReason(''); refreshData(); }
  };
  const handleResolveComplaint = async (resolution: string) => {
      if (showResolutionModal) { await resolveComplaint(showResolutionModal, resolution); setShowResolutionModal(null); refreshData(); }
  };
  const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      const supRes = await addSupplier({ id: `sup-${Date.now()}`, name: newSupplier.name, address: newSupplier.address, contact: newSupplier.contact });
      if (supRes.success) {
          await addInventoryItem({ id: `inv-${Date.now()}`, name: newSupplier.itemName, type: newSupplier.itemType as any, subtype: newSupplier.itemSubtype as any, quantity: 0, threshold: 50, unit: 'units', unitCost: newSupplier.unitCost, supplier: newSupplier.name, packSize: newSupplier.packSize });
          setShowSupplierModal(false); setNewSupplier({ name: '', address: '', contact: '', itemName: '', itemType: 'PACKAGING', itemSubtype: 'POUCH', packSize: 100, unitCost: 45 }); refreshData();
      }
  };
  const handleDeleteSupplier = async (id: string) => { if (window.confirm("Remove supplier?")) { const res = await deleteSupplier(id); if (res.success) refreshData(); } };
  const handleAddCustomer = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await addCustomer({ id: `cust-${Date.now()}`, name: newCustomer.name, email: newCustomer.email, contact: newCustomer.contact, address: newCustomer.address });
      if (res.success) { setShowCustomerModal(false); refreshData(); }
  };
  const handleEmailClient = () => { setIsSending(true); setTimeout(() => { setIsSending(false); alert("Email Sent Successfully!"); }, 2000); };
  const handlePrint = () => { setIsPrinting(true); setTimeout(() => { setIsPrinting(false); alert("Sent to Printer"); }, 2000); };

  // Calculations
  const lowStockItems = inventory.filter(i => i.quantity < i.threshold);
  const totalPackagingProcurement = purchaseOrders.filter(p => p.status === 'RECEIVED' || p.status === 'ORDERED').reduce((acc, p) => acc + p.totalCost, 0);
  const totalRawMaterialCost = dailyCosts.reduce((acc, d) => acc + d.rawMaterialCost, 0);
  const totalLaborCost = dailyCosts.reduce((acc, d) => acc + d.laborCost, 0);
  const totalWastageCost = dailyCosts.reduce((acc, d) => acc + d.wastageCost, 0);
  const totalOverallCost = totalPackagingProcurement + totalRawMaterialCost + totalLaborCost;
  const totalSalesRevenue = sales.filter(s => s.status === 'PAID' || s.status === 'DELIVERED').reduce((acc, s) => acc + s.totalAmount, 0);
  const netProfit = totalSalesRevenue - totalOverallCost;
  const avgCostPerUnit = finishedGoods.reduce((acc, i) => acc + i.quantity, 0) > 0 ? totalOverallCost / finishedGoods.reduce((acc, i) => acc + i.quantity, 0) : 0;
  
  const maxRevenue = weeklyRevenue.length > 0 ? Math.max(...weeklyRevenue.map(d => d.amount)) || 1 : 1;

  const createPieSlices = () => {
    let cumulativePercent = 0;
    const totalForPie = totalPackagingProcurement + totalRawMaterialCost + totalLaborCost + totalWastageCost;
    const data = [
        { label: 'Raw Materials', pct: 0, color: '#15803d', cost: totalRawMaterialCost }, 
        { label: 'Packaging', pct: 0, color: '#16a34a', cost: totalPackagingProcurement },
        { label: 'Labor', pct: 0, color: '#3b82f6', cost: totalLaborCost },
        { label: 'Wastage', pct: 0, color: '#ef4444', cost: totalWastageCost },
    ];
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
             return (
               <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 capitalize rounded-md text-sm font-bold ${activeTab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{t}</button>
             )
           })}
         </div>
      </div>

      {activeTab === 'procurement' && allowedTabs.includes('procurement') && (
        <div className="space-y-8 animate-in fade-in">
           {/* ... (Existing Procurement Code Omitted) ... */}
           {/* Re-including critical parts for context */}
           {lowStockItems.length > 0 && (
             <div className="bg-red-50 border-2 border-red-200 p-6 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-500">
                <div className="flex items-start">
                  <div className="bg-red-100 p-3 rounded-full mr-4">
                    <AlertTriangle className="text-red-600" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-900 text-lg">URGENT: Low Stock Alert</h4>
                    <p className="text-red-800 text-sm mb-2">Production may stall. Place orders immediately for:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {lowStockItems.map(i => (
                          <li key={i.id} className="font-medium">
                            <b>{i.name}</b>: {i.quantity} units left (Threshold: {i.threshold})
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
                <button 
                  onClick={() => setShowOrderModal(true)} 
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md flex items-center whitespace-nowrap ml-4 transition-colors"
                >
                  <ShoppingCart size={20} className="mr-2"/> Reorder Now
                </button>
             </div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Active Orders</h3>
                    <div className="flex space-x-2">
                        <button onClick={() => setShowSupplierModal(true)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold flex items-center hover:bg-slate-200"><Building2 size={18} className="mr-2"/> Manage Suppliers</button>
                        <button onClick={() => setShowOrderModal(true)} className="px-4 py-2 bg-earth-800 text-white rounded-lg font-bold flex items-center shadow-lg hover:bg-earth-900"><ShoppingCart size={18} className="mr-2"/> New Order</button>
                    </div>
                 </div>
                 {purchaseOrders.filter(p => p.status === 'ORDERED').length === 0 && <p className="text-slate-400 text-sm italic">No active orders pending.</p>}
                 {purchaseOrders.filter(p => p.status === 'ORDERED').map(po => (
                     <div key={po.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                        <div>
                           <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{po.supplier}</span>
                              <span className="text-xs text-slate-400">{new Date(po.dateOrdered).toLocaleDateString()}</span>
                           </div>
                           <h4 className="font-bold text-slate-800">{po.itemName}</h4>
                           <p className="text-sm text-slate-600">{po.quantity} packs ({po.totalUnits} units) • RM {po.totalCost.toFixed(2)}</p>
                        </div>
                        <div className="flex space-x-2">
                           <button onClick={() => setShowQCModal(po.id)} className="px-3 py-2 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 shadow">Received</button>
                        </div>
                     </div>
                 ))}
              </div>
              
              <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-3">Supplier Directory</h3>
                     <div className="space-y-3 text-sm">
                        {suppliers.map(s => (
                           <div key={s.id} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 group">
                              <div><p className="font-bold text-slate-700">{s.name}</p><p className="text-xs text-slate-500">{s.contact}</p></div>
                              <button onClick={() => handleDeleteSupplier(s.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                           </div>
                        ))}
                     </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- NEW SALES MODULE --- */}
      {activeTab === 'sales' && allowedTabs.includes('sales') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
           {/* NEW ORDER FORM */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Store className="mr-2"/> New Order</h3>
              <form className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Customer</label>
                    <div className="flex space-x-2">
                        <select className="w-full p-3 border rounded-lg bg-slate-50" value={salesCustomer} onChange={e => setSalesCustomer(e.target.value)} required>
                            <option value="">Select Customer...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowCustomerModal(true)} className="p-3 bg-nature-600 text-white rounded-lg hover:bg-nature-700"><Plus size={18}/></button>
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Product</label>
                    <select className="w-full p-3 border rounded-lg bg-slate-50" value={salesGood} onChange={e => setSalesGood(e.target.value)} required>
                        <option value="">Select Product...</option>
                        {Object.values(availableGoods).map((g: any) => (
                            <option key={g.key} value={g.key}>{g.label} (Stock: {g.totalQty})</option>
                        ))}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Qty</label>
                        <input type="number" min="1" className="w-full p-3 border rounded-lg" value={salesQty} onChange={e => setSalesQty(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Price/Unit</label>
                        <input type="number" step="0.01" className="w-full p-3 border rounded-lg" value={salesPrice} onChange={e => setSalesPrice(e.target.value)} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={(e) => handleCreateDocument(e, 'QUOTATION')} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">
                        Create Quote
                    </button>
                    <button onClick={(e) => handleCreateDocument(e, 'INVOICED')} className="w-full py-3 bg-nature-600 text-white rounded-xl font-bold shadow-lg hover:bg-nature-700">
                        Charge Invoice
                    </button>
                 </div>
              </form>
           </div>
           
           {/* SALES LEDGER */}
           <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-700 mb-2">Sales Ledger</h3>
              {sales.map(sale => (
                 <div key={sale.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-4 w-full md:w-auto">
                        <div className={`p-3 rounded-full flex-shrink-0 ${
                            sale.status === 'QUOTATION' ? 'bg-purple-100 text-purple-600' :
                            sale.status === 'PAID' ? 'bg-green-100 text-green-600' : 
                            sale.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                           {sale.status === 'QUOTATION' ? <FileClock size={20}/> : 
                            sale.status === 'PAID' ? <CheckCircle2 size={20}/> :
                            sale.status === 'SHIPPED' ? <Truck size={20}/> : <Store size={20}/>}
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                               <h4 className="font-bold text-slate-800">{sale.customerName}</h4>
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{sale.status}</span>
                           </div>
                           <p className="text-xs text-slate-500">RM {sale.totalAmount.toFixed(2)} • {new Date(sale.dateCreated).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    {/* ACTION BUTTONS */}
                    <div className="flex flex-wrap gap-2 justify-end">
                        {sale.status === 'QUOTATION' && (
                            <button 
                                onClick={() => handleUpdateStatus(sale, 'INVOICED')} 
                                disabled={updatingId === sale.id}
                                className="px-3 py-1.5 bg-nature-600 text-white text-xs font-bold rounded hover:bg-nature-700 flex items-center disabled:opacity-50"
                            >
                                {updatingId === sale.id ? <Loader2 size={12} className="animate-spin mr-1"/> : null}
                                Confirm & Invoice
                            </button>
                        )}
                        
                        {(sale.status === 'INVOICED') && (
                             <button 
                                onClick={() => handleUpdateStatus(sale, 'SHIPPED')} 
                                disabled={updatingId === sale.id}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 flex items-center disabled:opacity-50"
                             >
                                {updatingId === sale.id ? <Loader2 size={12} className="animate-spin mr-1"/> : null}
                                Generate DO
                             </button>
                        )}

                        {(sale.status === 'INVOICED' || sale.status === 'SHIPPED') && (
                             <button 
                                onClick={() => handleUpdateStatus(sale, 'PAID')} 
                                disabled={updatingId === sale.id}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex items-center disabled:opacity-50"
                             >
                                {updatingId === sale.id ? <Loader2 size={12} className="animate-spin mr-1"/> : null}
                                Mark Paid
                             </button>
                        )}

                        {/* DOCUMENT VIEWERS */}
                        <div className="flex border-l pl-2 ml-2 space-x-1">
                            {sale.status === 'QUOTATION' && (
                                <button onClick={() => handleOpenDocument(sale, 'QUOTATION')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="View Quote"><FileClock size={16}/></button>
                            )}
                            {sale.status !== 'QUOTATION' && (
                                <button onClick={() => handleOpenDocument(sale, 'INVOICE')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="View Invoice"><FileText size={16}/></button>
                            )}
                            {(sale.status === 'SHIPPED' || sale.status === 'PAID') && (
                                <button onClick={() => handleOpenDocument(sale, 'DO')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="View DO"><PackageCheck size={16}/></button>
                            )}
                            {sale.status === 'PAID' && (
                                <button onClick={() => handleOpenDocument(sale, 'RECEIPT')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="View Receipt"><Receipt size={16}/></button>
                            )}
                        </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* OVERVIEW CONTENT KEPT AS IS ... */}
      {activeTab === 'overview' && allowedTabs.includes('overview') && (
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Revenue</p>
                  <p className="text-2xl font-black text-green-700">RM {totalSalesRevenue.toFixed(2)}</p>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase">Cash Flow Exp.</p>
                  <p className="text-2xl font-black text-red-700">RM {totalOverallCost.toFixed(2)}</p>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase">Net Profit</p>
                  <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>RM {netProfit.toFixed(2)}</p>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase">Avg Cost/Unit</p>
                  <p className="text-2xl font-black text-slate-700">RM {avgCostPerUnit.toFixed(2)}</p>
               </div>
            </div>
            {/* Charts... */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><PieChart className="mr-2"/> Expense Breakdown</h3>
                  <div className="relative w-64 h-64">
                     <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full transform -rotate-90">
                        {slices.map((slice, i) => (
                           <path
                              key={i}
                              d={slice.pathData}
                              fill={slice.color}
                              className="cursor-pointer transition-all duration-300 hover:opacity-80"
                              onMouseEnter={() => setHoveredPieIndex(i)}
                              onMouseLeave={() => setHoveredPieIndex(null)}
                              stroke="white"
                              strokeWidth="0.02"
                           />
                        ))}
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {hoveredPieIndex !== null ? (
                            <>
                                <span className="text-xs font-bold text-slate-400">{slices[hoveredPieIndex].label}</span>
                                <span className="text-2xl font-black text-slate-800">{slices[hoveredPieIndex].pct.toFixed(1)}%</span>
                                <span className="text-xs font-medium text-slate-500">RM {slices[hoveredPieIndex].cost.toFixed(2)}</span>
                            </>
                        ) : (
                            <span className="text-xs font-bold text-slate-400">Total Exp.<br/>RM {totalOverallCost.toFixed(2)}</span>
                        )}
                     </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                     {slices.map((slice, i) => (
                        <div key={i} className="flex items-center text-xs font-bold text-slate-600">
                           <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: slice.color }}></div>
                           {slice.label}
                        </div>
                     ))}
                  </div>
               </div>
         </div>
      )}

      {/* --- UNIFIED DOCUMENT MODAL --- */}
      {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                  
                  {/* DOCUMENT HEADER */}
                  <div className={`text-white p-8 flex justify-between items-start ${
                      viewDocType === 'QUOTATION' ? 'bg-purple-700' :
                      viewDocType === 'INVOICE' ? 'bg-slate-800' :
                      viewDocType === 'DO' ? 'bg-blue-700' : 'bg-green-700'
                  }`}>
                      <div>
                          <h2 className="text-4xl font-bold tracking-widest uppercase">
                            {viewDocType === 'DO' ? 'DELIVERY ORDER' : viewDocType}
                          </h2>
                          <p className="opacity-80 text-sm mt-1">
                              #{selectedSale.invoiceId} 
                              {viewDocType === 'QUOTATION' && ' (Estimate)'}
                          </p>
                      </div>
                      <div className="text-right">
                          <h3 className="font-bold text-xl">ShroomTrack ERP</h3>
                          <p className="opacity-80 text-sm mt-1">123 Industrial Park<br/>Kuala Lumpur, 50000</p>
                      </div>
                  </div>

                  {/* CONTENT */}
                  <div className="overflow-y-auto flex-1 bg-white p-8">
                      {/* ADDRESSES */}
                      <div className="flex flex-col md:flex-row justify-between mb-8">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                                  {viewDocType === 'DO' ? 'Ship To' : 'Bill To'}
                              </p>
                              <h4 className="text-2xl font-bold text-slate-800 mb-1">{selectedSale.customerName}</h4>
                              <p className="text-slate-500 text-sm">{selectedSale.customerEmail}</p>
                              <p className="text-slate-500 text-sm">{selectedSale.customerPhone}</p>
                          </div>
                          <div className="text-right space-y-1">
                              <div className="flex justify-between md:justify-end md:space-x-8">
                                  <span className="text-slate-500 text-sm">Date:</span>
                                  <span className="font-bold text-slate-800">{new Date(selectedSale.dateCreated).toLocaleDateString()}</span>
                              </div>
                              {viewDocType === 'QUOTATION' && (
                                  <div className="flex justify-between md:justify-end md:space-x-8">
                                      <span className="text-slate-500 text-sm">Valid Until:</span>
                                      <span className="font-bold text-slate-800">{new Date(Date.now() + 12096e5).toLocaleDateString()}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* LINE ITEMS */}
                      <table className="w-full text-left mb-8">
                          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                              <tr>
                                  <th className="px-4 py-3 font-bold">Item</th>
                                  <th className="px-4 py-3 font-bold text-center">Qty</th>
                                  {viewDocType !== 'DO' && <th className="px-4 py-3 font-bold text-right">Price</th>}
                                  {viewDocType !== 'DO' && <th className="px-4 py-3 font-bold text-right">Total</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {selectedSale.items.map((item, i) => (
                                  <tr key={i}>
                                      <td className="px-4 py-4">
                                          <p className="font-bold text-slate-800">{item.recipeName}</p>
                                          <p className="text-xs text-slate-400 uppercase">({item.packagingType})</p>
                                      </td>
                                      <td className="px-4 py-4 text-center font-bold">{item.quantity}</td>
                                      {viewDocType !== 'DO' && <td className="px-4 py-4 text-right text-slate-600">RM {item.unitPrice.toFixed(2)}</td>}
                                      {viewDocType !== 'DO' && <td className="px-4 py-4 text-right font-bold">RM {(item.quantity * item.unitPrice).toFixed(2)}</td>}
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      {/* FOOTER TOTALS OR SIGNATURES */}
                      {viewDocType !== 'DO' ? (
                          <div className="flex flex-col items-end space-y-2 border-t pt-4">
                              <div className="flex justify-between w-64 text-slate-800 text-2xl font-bold">
                                  <span>Total</span>
                                  <span>RM {selectedSale.totalAmount.toFixed(2)}</span>
                              </div>
                              {viewDocType === 'RECEIPT' && (
                                  <div className="text-green-600 font-bold border-2 border-green-600 px-4 py-1 rounded rotate-[-10deg] mt-4 opacity-50">
                                      PAID IN FULL
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-20 mt-12">
                               <div className="border-t border-slate-300 pt-2">
                                   <p className="text-xs font-bold text-slate-500 uppercase">Authorized Signature</p>
                                   <p className="text-sm">ShroomTrack ERP</p>
                               </div>
                               <div className="border-t border-slate-300 pt-2">
                                   <p className="text-xs font-bold text-slate-500 uppercase">Received By</p>
                                   <p className="text-sm">{selectedSale.customerName}</p>
                               </div>
                          </div>
                      )}
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                      <button onClick={() => setSelectedSale(null)} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded">Close</button>
                      
                      <div className="flex space-x-3">
                          {/* WORKFLOW BUTTONS INSIDE MODAL */}
                          {selectedSale.status === 'QUOTATION' && viewDocType === 'QUOTATION' && (
                              <button 
                                onClick={() => handleUpdateStatus(selectedSale, 'INVOICED')} 
                                disabled={updatingId === selectedSale.id}
                                className="px-6 py-2 bg-nature-600 text-white font-bold rounded shadow hover:bg-nature-700 disabled:opacity-50 flex items-center"
                              >
                                {updatingId === selectedSale.id ? <Loader2 size={16} className="animate-spin mr-2"/> : null}
                                Confirm & Invoice
                              </button>
                          )}
                          {selectedSale.status === 'INVOICED' && viewDocType === 'INVOICE' && (
                              <button 
                                onClick={() => handleUpdateStatus(selectedSale, 'SHIPPED')} 
                                disabled={updatingId === selectedSale.id}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 disabled:opacity-50 flex items-center"
                              >
                                {updatingId === selectedSale.id ? <Loader2 size={16} className="animate-spin mr-2"/> : null}
                                Generate DO
                              </button>
                          )}
                          {(selectedSale.status === 'INVOICED' || selectedSale.status === 'SHIPPED') && (viewDocType === 'INVOICE' || viewDocType === 'DO') && (
                              <button 
                                onClick={() => handleUpdateStatus(selectedSale, 'PAID')} 
                                disabled={updatingId === selectedSale.id}
                                className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 disabled:opacity-50 flex items-center"
                              >
                                {updatingId === selectedSale.id ? <Loader2 size={16} className="animate-spin mr-2"/> : null}
                                Mark Paid
                              </button>
                          )}

                          <button onClick={handlePrint} className="px-6 py-2 bg-slate-800 text-white font-bold rounded flex items-center shadow">
                              <Printer size={16} className="mr-2"/> Print
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- OTHER MODALS --- */}
      {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <h3 className="font-bold text-lg mb-4">Add Customer</h3>
                  <form onSubmit={handleAddCustomer} className="space-y-3">
                      <input placeholder="Name" className="w-full p-2 border rounded" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                      <input placeholder="Email" className="w-full p-2 border rounded" required value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                      <input placeholder="Phone" className="w-full p-2 border rounded" value={newCustomer.contact} onChange={e => setNewCustomer({...newCustomer, contact: e.target.value})} />
                      <input placeholder="Address" className="w-full p-2 border rounded" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                      <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg mt-2">Save Customer</button>
                  </form>
                  <button onClick={() => setShowCustomerModal(false)} className="mt-3 w-full text-sm text-slate-500">Cancel</button>
              </div>
          </div>
      )}
      
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center"><ShoppingCart className="mr-2 text-earth-600"/> New Purchase Order</h3>
                <form onSubmit={handleCreatePO} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Select Item</label>
                        <select className="w-full p-2 border rounded" value={poItem} onChange={e => setPoItem(e.target.value)} required>
                            <option value="">Select Item...</option>
                            {inventory.map(i => {
                                const isLow = i.quantity < (i.threshold || 0);
                                return (
                                    <option 
                                        key={i.id} 
                                        value={i.id} 
                                        className={isLow ? "text-red-600 font-bold bg-red-50" : "text-slate-700"}
                                    >
                                        {i.name} {isLow ? '(Low Stock!)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Quantity (Packs)</label>
                        <input type="number" min="1" className="w-full p-2 border rounded" value={poQtyPackages} onChange={e => setPoQtyPackages(e.target.value)} required />
                        {poItem && (() => {
                            const i = inventory.find(x => x.id === poItem);
                            return i ? <p className="text-xs text-slate-400 mt-1">1 Pack = {i.packSize} units. Total: {parseInt(poQtyPackages||'0') * (i.packSize||1)} units.</p> : null;
                        })()}
                    </div>
                    <div className="flex space-x-3 pt-2">
                        <button type="button" onClick={() => setShowOrderModal(false)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button type="submit" className="flex-1 py-2 bg-earth-800 text-white font-bold rounded-lg hover:bg-earth-900">Place Order</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;