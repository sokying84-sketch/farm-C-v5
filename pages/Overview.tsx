
import React, { useEffect, useState } from 'react';
import { fetchBatches, getFinishedGoods, getDailyProductionCosts, getLaborRate, getRawMaterialRate } from '../services/sheetService';
import { MushroomBatch, BatchStatus, FinishedGood, DailyCostMetrics } from '../types';
import { Truck, Droplets, Package, TrendingUp, ArrowRight, Activity, ClipboardList, DollarSign, Sprout, Clock } from 'lucide-react';

const OverviewPage: React.FC = () => {
  const [batches, setBatches] = useState<MushroomBatch[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [costs, setCosts] = useState<DailyCostMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [laborRate, setLaborRate] = useState(0);
  const [rawRate, setRawRate] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const [batchRes, goodsRes, costRes] = await Promise.all([
          fetchBatches(), 
          getFinishedGoods(),
          getDailyProductionCosts()
      ]);
      
      if (batchRes.success && batchRes.data) {
        setBatches(batchRes.data);
      }
      if (goodsRes.success && goodsRes.data) {
        setFinishedGoods(goodsRes.data);
      }
      if (costRes.success && costRes.data) {
        // Sort costs by date descending
        setCosts(costRes.data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
      
      setLaborRate(getLaborRate());
      setRawRate(getRawMaterialRate());
      setLoading(false);
    };
    loadData();
  }, []);

  // Calculate Metrics
  const receivedCount = batches.filter(b => b.status === BatchStatus.RECEIVED).length;
  const processingCount = batches.filter(b => b.status === BatchStatus.PROCESSING).length;
  const readyToPackCount = batches.filter(b => b.status === BatchStatus.DRYING_COMPLETE).length;
  
  // Count actual finished units available in stock
  const finishedCount = finishedGoods.reduce((acc, item) => acc + item.quantity, 0);
  
  const totalWeight = batches.reduce((acc, b) => acc + b.netWeightKg, 0);

  const ProcessCard = ({ title, count, icon: Icon, color, desc, suffix }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
      <div className={`p-4 rounded-full ${color} bg-opacity-10 mb-3 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} className={color.replace('bg-', 'text-')} />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <div className="text-4xl font-bold text-slate-900 my-2">{count} {suffix && <span className="text-sm text-slate-400 font-normal">{suffix}</span>}</div>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  );

  const ArrowDivider = () => (
    <div className="hidden md:flex items-center justify-center text-slate-300">
      <ArrowRight size={24} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-earth-900">Operations Overview</h2>
        <p className="text-earth-600">Live production pipeline monitoring</p>
      </div>

      {/* Process Pipeline Visual */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 items-center">
        <ProcessCard 
          title="Receiving" 
          count={receivedCount} 
          icon={Truck} 
          color="bg-blue-500 text-blue-600"
          desc="Batches waiting for wash"
          suffix="Batches"
        />
        <ArrowDivider />
        <ProcessCard 
          title="Processing" 
          count={processingCount} 
          icon={Droplets} 
          color="bg-orange-500 text-orange-600"
          desc="Currently washing/drying"
          suffix="Batches"
        />
        <ArrowDivider />
        <ProcessCard 
          title="Packing" 
          count={readyToPackCount} 
          icon={Package} 
          color="bg-purple-500 text-purple-600"
          desc="Dried & ready to label"
          suffix="Batches"
        />
        <ArrowDivider />
        <ProcessCard 
          title="Finished Stock" 
          count={finishedCount} 
          icon={TrendingUp} 
          color="bg-green-500 text-green-600"
          desc="Units ready for sale"
          suffix="Units"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Activity size={20} className="mr-2 text-nature-600" />
              Recent Batch Activity
            </h3>
            <span className="text-xs font-medium text-slate-400">Live Updates</span>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <p className="text-slate-400 text-center py-4">Syncing with Master Log...</p>
            ) : batches.slice(0, 5).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    batch.status === BatchStatus.RECEIVED ? 'bg-blue-500' :
                    batch.status === BatchStatus.PROCESSING ? 'bg-orange-500' :
                    batch.status === BatchStatus.DRYING_COMPLETE ? 'bg-purple-500' :
                    'bg-green-500'
                  }`} />
                  <div>
                    <p className="font-medium text-slate-700 text-sm">{batch.id} - {batch.sourceFarm}</p>
                    <p className="text-xs text-slate-400">{new Date(batch.dateReceived).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                    {batch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-earth-800 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-earth-200 font-medium mb-1">Total Net Weight Processed</h3>
            <div className="text-4xl font-bold mb-4">{totalWeight.toFixed(1)} <span className="text-lg text-earth-400">kg</span></div>
            
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-sm text-earth-300">
                <span>System Health</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-earth-700 rounded-full h-1.5">
                <div className="bg-nature-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-earth-700">
              <p className="text-xs text-earth-400 leading-relaxed">
                Data is automatically synced to the Master Google Sheet. 
                Manage detailed workflows using the sidebar navigation.
              </p>
            </div>
          </div>
          
          {/* Decorative background element */}
          <div className="absolute -bottom-10 -right-10 text-earth-700 opacity-20">
            <TrendingUp size={150} />
          </div>
        </div>
      </div>

      {/* Daily Production Cost Log (Batch-by-Batch) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center">
                  <DollarSign size={20} className="mr-2 text-earth-600" />
                  Daily Production Cost Log (Batch-by-Batch)
              </h3>
              <div className="flex gap-2">
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100 flex items-center">
                      <Sprout size={12} className="mr-1"/> Raw Rate: RM {rawRate.toFixed(2)}/kg
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 flex items-center">
                      <Clock size={12} className="mr-1"/> Labor Rate: RM {laborRate.toFixed(2)}/hr
                  </span>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-4 font-bold">Date / Batch</th>
                          <th className="px-6 py-4 font-bold">Processed</th>
                          <th className="px-6 py-4 font-bold text-green-700">Raw Material</th>
                          <th className="px-6 py-4 font-bold text-slate-600">Packaging</th>
                          <th className="px-6 py-4 font-bold text-blue-700">Labor</th>
                          <th className="px-6 py-4 font-bold text-red-700">Wastage</th>
                          <th className="px-6 py-4 font-bold text-right">Total Cost</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {costs.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-400">No cost logs recorded.</td></tr>
                      ) : (
                          costs.map((cost) => (
                              <tr key={cost.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-700">{new Date(cost.date).toLocaleDateString()}</div>
                                      <div className="text-xs text-slate-400 font-mono uppercase group-hover:text-slate-600 transition-colors">{cost.referenceId}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      {cost.weightProcessed > 0 && <div>{cost.weightProcessed} kg</div>}
                                      {cost.processingHours > 0 && <div className="text-xs text-slate-500">{cost.processingHours} hrs</div>}
                                      {!cost.weightProcessed && !cost.processingHours && <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-green-700">
                                      {cost.rawMaterialCost > 0 ? `RM ${cost.rawMaterialCost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-600">
                                      {cost.packagingCost > 0 ? `RM ${cost.packagingCost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-blue-600">
                                      {cost.laborCost > 0 ? `RM ${cost.laborCost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-red-600">
                                      {cost.wastageCost > 0 ? `RM ${cost.wastageCost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-800 bg-slate-50/50">
                                      RM {cost.totalCost.toFixed(2)}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Detailed Batch Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center">
            <ClipboardList size={20} className="mr-2 text-earth-600" />
            Detailed Batch Log
          </h3>
          <span className="text-xs font-medium text-slate-400">All Active & Recent Batches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">Batch ID</th>
                <th className="px-6 py-4 font-bold">Source Farm</th>
                <th className="px-6 py-4 font-bold">Current Status</th>
                <th className="px-6 py-4 font-bold">Date Received</th>
                <th className="px-6 py-4 font-bold text-right">Net Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading batch data...</td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No batch history found.</td></tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-600">{batch.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{batch.sourceFarm}</td>
                    <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                            batch.status === BatchStatus.RECEIVED ? 'bg-blue-100 text-blue-700' :
                            batch.status === BatchStatus.PROCESSING ? 'bg-orange-100 text-orange-700' :
                            batch.status === BatchStatus.DRYING_COMPLETE ? 'bg-purple-100 text-purple-700' :
                            batch.status === BatchStatus.PACKED ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                            {batch.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(batch.dateReceived).toLocaleDateString()} <span className="text-xs opacity-70 ml-1">{new Date(batch.dateReceived).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{batch.netWeightKg.toFixed(2)} kg</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
