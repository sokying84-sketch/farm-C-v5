
import React, { useState, useEffect } from 'react';
import { getCustomers, getCustomerStats, updateCustomer, addCustomer } from '../services/sheetService';
import { Customer } from '../types';
import { Users, Building2, User, Phone, Mail, Star, Clock, ShoppingBag, MessageCircle, Search, Plus, Wallet, ArrowRight, Pencil, X } from 'lucide-react';

const CRMPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ type: 'B2C', status: 'ACTIVE' });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedId) loadStats(selectedId);
  }, [selectedId]);

  const loadData = async () => {
    const res = await getCustomers();
    if (res.success && res.data) setCustomers(res.data);
  };

  const loadStats = async (id: string) => {
    const data = await getCustomerStats(id);
    setStats(data);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCustomer({
        id: `cust-${Date.now()}`,
        name: newCustomer.name || 'Unknown',
        email: newCustomer.email || '',
        contact: newCustomer.contact || '',
        address: newCustomer.address || '',
        type: newCustomer.type as 'B2B' | 'B2C' || 'B2C',
        status: 'ACTIVE',
        joinDate: new Date().toISOString()
    } as Customer);
    setShowAddModal(false);
    loadData();
  };

  const handleEditClick = () => {
      const customer = customers.find(c => c.id === selectedId);
      if (customer) {
          setEditingCustomer({ ...customer });
          setShowEditModal(true);
      }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCustomer.id) {
          await updateCustomer(editingCustomer.id, editingCustomer);
          setShowEditModal(false);
          loadData(); // Refresh list to show changes
      }
  };

  const sendWhatsApp = (phone: string, name: string, type: 'PROMO' | 'UPDATE') => {
      const cleanPhone = phone?.replace(/\D/g, '') || '';
      if (cleanPhone.length < 9) {
          alert("Invalid phone number for WhatsApp");
          return;
      }

      let msg = '';
      if (type === 'PROMO') {
          msg = `Hi ${name}! We have fresh mushrooms harvested today at the Village Co-op. Interested in restocking?`;
      } else {
          msg = `Hi ${name}, just checking in on your last order. Everything good?`;
      }
      
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filter Logic
  const filteredCustomers = customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || c.type === filterType;
      return matchesSearch && matchesType;
  });

  const selectedCustomer = customers.find(c => c.id === selectedId);

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-6">
      
      {/* LEFT COLUMN: LIST */}
      <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {/* Header / Search */}
        <div className="p-4 border-b border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-800 flex items-center"><Users className="mr-2 text-earth-600"/> CRM</h2>
                <button onClick={() => setShowAddModal(true)} className="p-2 bg-nature-600 text-white rounded-lg hover:bg-nature-700 transition-colors">
                    <Plus size={20} />
                </button>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                <input 
                    className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex gap-2">
                {['ALL', 'B2B', 'B2C'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setFilterType(t as any)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${filterType === t ? 'bg-earth-100 text-earth-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredCustomers.map(c => (
                <div 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedId === c.id ? 'bg-earth-50 border-earth-300 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-800">{c.name}</h4>
                            <p className="text-xs text-slate-500 truncate">{c.email}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${c.type === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {c.type || 'B2C'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAILS */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {selectedCustomer ? (
              <div className="flex flex-col h-full">
                  {/* Banner */}
                  <div className="h-32 bg-gradient-to-r from-earth-600 to-earth-800 p-6 flex justify-between items-start text-white relative">
                      <div className="mt-auto">
                          <div className="flex items-center gap-2 mb-1">
                              <h1 className="text-3xl font-bold">{selectedCustomer.name}</h1>
                              {stats?.totalSpent > 1000 && <Star className="text-yellow-400 fill-yellow-400" size={24} />}
                          </div>
                          <div className="flex items-center gap-4 text-sm opacity-90">
                              <span className="flex items-center"><Mail size={14} className="mr-1"/> {selectedCustomer.email}</span>
                              <span className="flex items-center"><Phone size={14} className="mr-1"/> {selectedCustomer.contact}</span>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end h-full justify-between">
                          <div className="flex gap-2">
                              <button 
                                onClick={handleEditClick}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors backdrop-blur-sm"
                                title="Edit Profile"
                              >
                                  <Pencil size={18} />
                              </button>
                          </div>
                          
                          <div className="text-right">
                              <p className="text-xs uppercase font-bold opacity-70">Customer Type</p>
                              <div className="flex items-center justify-end gap-2">
                                 {selectedCustomer.type === 'B2B' ? <Building2 size={20}/> : <User size={20}/>}
                                 <p className="text-xl font-bold">{selectedCustomer.type === 'B2B' ? 'Business Partner' : 'Individual'}</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="p-6 grid grid-cols-4 gap-4 border-b border-slate-100">
                      <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center"><Wallet size={12} className="mr-1"/> Total Spent</p>
                          <p className="text-2xl font-black text-slate-800">RM {stats?.totalSpent.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center"><ShoppingBag size={12} className="mr-1"/> Orders</p>
                          <p className="text-2xl font-black text-slate-800">{stats?.orderCount || 0}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center"><Star size={12} className="mr-1"/> Favorite</p>
                          <p className="text-lg font-bold text-slate-800 truncate" title={stats?.favoriteProduct}>{stats?.favoriteProduct || '-'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center"><Clock size={12} className="mr-1"/> Last Order</p>
                          <p className="text-lg font-bold text-slate-800">{stats?.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : 'Never'}</p>
                      </div>
                  </div>

                  {/* Actions & Notes - SCROLLABLE */}
                  <div className="p-6 flex-1 bg-slate-50/50 overflow-y-auto custom-scrollbar">
                      <h3 className="font-bold text-slate-800 mb-4">Engagement Actions</h3>
                      <div className="flex gap-4 mb-8">
                          <button 
                             onClick={() => sendWhatsApp(selectedCustomer.contact || '', selectedCustomer.name, 'PROMO')}
                             className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center"
                          >
                              <MessageCircle className="mr-2" /> Send Stock Update (WhatsApp)
                          </button>
                          <button 
                             onClick={() => sendWhatsApp(selectedCustomer.contact || '', selectedCustomer.name, 'UPDATE')}
                             className="flex-1 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center"
                          >
                              <MessageCircle className="mr-2" /> Follow Up Message
                          </button>
                      </div>

                      <h3 className="font-bold text-slate-800 mb-2">Customer Notes</h3>
                      <textarea 
                          className="w-full h-32 p-4 border border-slate-200 rounded-xl text-sm mb-8"
                          placeholder="Add notes about preferences, delivery instructions, etc..."
                          defaultValue={selectedCustomer.notes}
                          onBlur={(e) => updateCustomer(selectedCustomer.id, { notes: e.target.value })}
                      ></textarea>

                      {/* PURCHASE HISTORY */}
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                          <ShoppingBag size={18} className="mr-2 text-earth-600"/> Purchase History
                      </h3>
                      
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                                  <tr>
                                      <th className="px-4 py-3">Date</th>
                                      <th className="px-4 py-3">Invoice</th>
                                      <th className="px-4 py-3">Total</th>
                                      <th className="px-4 py-3 text-right">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {stats?.salesHistory?.map((sale: any) => (
                                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 text-slate-600">{new Date(sale.dateCreated).toLocaleDateString()}</td>
                                          <td className="px-4 py-3 font-mono text-xs text-slate-500">#{sale.invoiceId}</td>
                                          <td className="px-4 py-3 font-bold text-slate-800">RM {sale.totalAmount.toFixed(2)}</td>
                                          <td className="px-4 py-3 text-right">
                                              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                                  sale.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                  sale.status === 'QUOTATION' ? 'bg-purple-100 text-purple-700' :
                                                  sale.status === 'DELIVERED' ? 'bg-blue-100 text-blue-700' :
                                                  'bg-orange-100 text-orange-700'
                                              }`}>
                                                  {sale.status}
                                              </span>
                                          </td>
                                      </tr>
                                  ))}
                                  {(!stats?.salesHistory || stats.salesHistory.length === 0) && (
                                      <tr><td colSpan={4} className="p-6 text-center text-slate-400 italic">No purchase history found.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Users size={64} className="mb-4 opacity-20" />
                  <p>Select a customer to view CRM profile</p>
              </div>
          )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl w-96 shadow-xl">
                  <h3 className="font-bold text-lg mb-4">Add New Customer</h3>
                  <form onSubmit={handleAddSubmit} className="space-y-3">
                      <input required placeholder="Name" className="w-full p-2 border rounded" onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                      <div className="grid grid-cols-2 gap-2">
                          <input required placeholder="Email" className="w-full p-2 border rounded" onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                          <input required placeholder="Phone" className="w-full p-2 border rounded" onChange={e => setNewCustomer({...newCustomer, contact: e.target.value})} />
                      </div>
                      <textarea placeholder="Address" className="w-full p-2 border rounded" onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                      
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setNewCustomer({...newCustomer, type: 'B2C'})} className={`flex-1 p-2 rounded border font-bold ${newCustomer.type === 'B2C' ? 'bg-green-100 border-green-300 text-green-700' : 'border-slate-200'}`}>Individual (B2C)</button>
                          <button type="button" onClick={() => setNewCustomer({...newCustomer, type: 'B2B'})} className={`flex-1 p-2 rounded border font-bold ${newCustomer.type === 'B2B' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200'}`}>Business (B2B)</button>
                      </div>

                      <button className="w-full py-3 bg-earth-800 text-white font-bold rounded-lg mt-2">Save Profile</button>
                  </form>
                  <button onClick={() => setShowAddModal(false)} className="w-full mt-2 text-sm text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCustomer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl w-96 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">Edit Customer</h3>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleUpdateSubmit} className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-500">Name</label>
                          <input required className="w-full p-2 border rounded" value={editingCustomer.name || ''} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <div>
                              <label className="text-xs font-bold text-slate-500">Email</label>
                              <input required className="w-full p-2 border rounded" value={editingCustomer.email || ''} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500">Phone</label>
                              <input required className="w-full p-2 border rounded" value={editingCustomer.contact || ''} onChange={e => setEditingCustomer({...editingCustomer, contact: e.target.value})} />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500">Address</label>
                          <textarea className="w-full p-2 border rounded" value={editingCustomer.address || ''} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} />
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Type</label>
                          <div className="flex gap-2">
                              <button type="button" onClick={() => setEditingCustomer({...editingCustomer, type: 'B2C'})} className={`flex-1 p-2 rounded border font-bold ${editingCustomer.type === 'B2C' ? 'bg-green-100 border-green-300 text-green-700' : 'border-slate-200'}`}>B2C</button>
                              <button type="button" onClick={() => setEditingCustomer({...editingCustomer, type: 'B2B'})} className={`flex-1 p-2 rounded border font-bold ${editingCustomer.type === 'B2B' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200'}`}>B2B</button>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Status</label>
                          <select 
                            className="w-full p-2 border rounded" 
                            value={editingCustomer.status || 'ACTIVE'} 
                            onChange={e => setEditingCustomer({...editingCustomer, status: e.target.value as any})}
                          >
                              <option value="ACTIVE">Active</option>
                              <option value="VIP">VIP</option>
                              <option value="INACTIVE">Inactive</option>
                          </select>
                      </div>

                      <button className="w-full py-3 bg-earth-800 text-white font-bold rounded-lg mt-2">Update Profile</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CRMPage;
