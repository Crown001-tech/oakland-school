'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Truck,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface InventoryItem {
  id: string;
  name: string;
  category: 'stationery' | 'science_lab' | 'sports' | 'it_hardware' | 'medical' | 'textbooks' | 'maintenance';
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface ProcurementRequest {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
  urgency: 'low' | 'medium' | 'critical';
  justification: string;
  requestedByName: string;
  status: 'pending_principal' | 'pending_proprietor' | 'approved' | 'rejected' | 'delivered';
  approvedBy?: string;
  approvalNotes?: string;
  createdAt: string;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'procurement'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [procurementStatusFilter, setProcurementStatusFilter] = useState('all');

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryItem['category']>('stationery');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('units');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');

  // New Request Form
  const [reqItemName, setReqItemName] = useState('');
  const [reqCategory, setReqCategory] = useState('stationery');
  const [reqQty, setReqQty] = useState('');
  const [reqUnit, setReqUnit] = useState('units');
  const [reqCost, setReqCost] = useState('');
  const [reqUrgency, setReqUrgency] = useState<ProcurementRequest['urgency']>('medium');
  const [reqJustification, setReqJustification] = useState('');

  // Fetch from PostgreSQL via /api/inventory
  const loadData = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInventory(data.inventory || []);
          setRequests(data.requests || []);
        }
      }
    } catch {
      // Empty state handled cleanly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + delta);

    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_stock',
          id,
          quantity: newQty,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setInventory((prev) =>
          prev.map((i) => (i.id === id ? data.item : i))
        );
        showToast('Stock quantity updated in database');
      } else {
        showToast(data.message || 'Failed to update stock');
      }
    } catch {
      showToast('Network error updating stock quantity');
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_request',
          id,
          decision: 'approved',
          approverName: 'Mr Seyi Bankole (Principal)',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'approved', approvedBy: 'Mr Seyi Bankole (Principal)' } : r))
        );
        showToast('Purchase request approved');
      } else {
        showToast(data.message || 'Failed to approve request');
      }
    } catch {
      showToast('Network error updating purchase request');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_request',
          id,
          decision: 'rejected',
          approverName: 'Mr Seyi Bankole (Principal)',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'rejected', approvedBy: 'Rejected by Principal' } : r))
        );
        showToast('Purchase request declined');
      } else {
        showToast(data.message || 'Failed to decline request');
      }
    } catch {
      showToast('Network error updating purchase request');
    }
  };

  const handleMarkDelivered = async (id: string) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_delivered',
          id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'delivered' } : r))
        );
        showToast('Items received. Stock ledger replenished in database.');
        loadData();
      } else {
        showToast(data.message || 'Failed to record delivery');
      }
    } catch {
      showToast('Network error recording shipment delivery');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          name: newItemName.trim(),
          category: newItemCategory,
          quantity: Number(newItemQty) || 0,
          unit: newItemUnit.trim(),
          reorderLevel: 10,
          unitCost: Number(newItemCost) || 0,
          location: newItemLocation.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setInventory((prev) => [data.item, ...prev]);
        setIsAddItemOpen(false);
        setNewItemName('');
        showToast(`Added ${data.item.name} to inventory ledger`);
      } else {
        showToast(data.message || 'Failed to save inventory item');
      }
    } catch {
      showToast('Network error saving inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqItemName.trim() || !reqJustification.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_request',
          itemName: reqItemName.trim(),
          category: reqCategory,
          quantity: Number(reqQty) || 1,
          unit: reqUnit.trim(),
          estimatedUnitCost: Number(reqCost) || 0,
          urgency: reqUrgency,
          justification: reqJustification.trim(),
          requestedByName: 'Mr Seyi Bankole (Principal)',
        }),
      });

      const data = await res.json();
      if (data.success && data.request) {
        setRequests((prev) => [data.request, ...prev]);
        setIsNewReqOpen(false);
        setReqItemName('');
        setReqJustification('');
        showToast('Purchase request recorded in procurement ledger');
      } else {
        showToast(data.message || 'Failed to submit request');
      }
    } catch {
      showToast('Network error submitting purchase request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered lists
  const filteredInventory = inventory.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (onlyLowStock && item.status === 'in_stock') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredRequests = requests.filter((req) => {
    if (procurementStatusFilter === 'all') return true;
    if (procurementStatusFilter === 'pending') {
      return req.status === 'pending_principal' || req.status === 'pending_proprietor';
    }
    return req.status === procurementStatusFilter;
  });

  const lowStockCount = inventory.filter((i) => i.status === 'low_stock').length;
  const pendingRequestsCount = requests.filter(
    (r) => r.status === 'pending_principal' || r.status === 'pending_proprietor'
  ).length;

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage school supplies, track stock levels, and review purchase requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'inventory' ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddItemOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock Item</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsNewReqOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Purchase Request</span>
            </Button>
          )}
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Current Stock</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
            {inventory.length}
          </span>
          {lowStockCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {lowStockCount} low
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('procurement')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'procurement'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Purchase Requests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
            {requests.length}
          </span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {pendingRequestsCount} pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: INVENTORY STOCK */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search stock by name or store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-slate-800 bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="stationery">Stationery</option>
                  <option value="science_lab">Science Lab</option>
                  <option value="it_hardware">Technology</option>
                  <option value="sports">Sports</option>
                  <option value="medical">Medical</option>
                  <option value="textbooks">Textbooks</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyLowStock}
                  onChange={(e) => setOnlyLowStock(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>Low stock only</span>
              </label>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Item Name</th>
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">In Stock</th>
                  <th className="py-2.5 px-4 font-semibold">Unit Cost</th>
                  <th className="py-2.5 px-4 font-semibold">Storage Location</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      No inventory items recorded yet. Use &quot;Add Stock Item&quot; to catalog supplies and materials.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const isLow = item.status === 'low_stock';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 capitalize">
                          {item.category.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          ₦{item.unitCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{item.location}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, -1)}
                              className="w-6 h-6 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                              title="Deduct 1"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, 5)}
                              className="px-2 h-6 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-[10px] cursor-pointer"
                              title="Add 5"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROCUREMENT REQUESTS */}
      {activeTab === 'procurement' && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'pending', label: 'Awaiting Approval' },
              { id: 'approved', label: 'Approved' },
              { id: 'delivered', label: 'Delivered' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setProcurementStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  procurementStatusFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Item Details</th>
                  <th className="py-2.5 px-4 font-semibold">Quantity</th>
                  <th className="py-2.5 px-4 font-semibold">Estimated Cost</th>
                  <th className="py-2.5 px-4 font-semibold">Requester</th>
                  <th className="py-2.5 px-4 font-semibold">Urgency</th>
                  <th className="py-2.5 px-4 font-semibold">Approval Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      No procurement requests recorded. Click &quot;New Purchase Request&quot; to initiate requisitions.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isPendingPrincipal = req.status === 'pending_principal';
                    const isPendingProprietor = req.status === 'pending_proprietor';
                    const isApproved = req.status === 'approved';
                    const isDelivered = req.status === 'delivered';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{req.itemName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {req.justification}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {req.quantity} {req.unit}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ₦{req.estimatedTotalCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{req.requestedByName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.urgency === 'critical'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : req.urgency === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.urgency === 'critical' ? 'Urgent' : req.urgency}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isPendingPrincipal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Awaiting Principal
                            </span>
                          )}
                          {isPendingProprietor && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              Escalated to Proprietor
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              Approved
                            </span>
                          )}
                          {isDelivered && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Delivered and Restocked
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Declined
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPendingPrincipal && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-2 py-1 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleMarkDelivered(req.id)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Mark Delivered</span>
                            </button>
                          )}
                          {(isDelivered || req.status === 'rejected' || isPendingProprietor) && (
                            <span className="text-slate-400 text-[11px]">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Stock Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Stock Item</h3>
              <button
                type="button"
                onClick={() => setIsAddItemOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A4 Graph Books"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  >
                    <option value="stationery">Stationery</option>
                    <option value="science_lab">Science Lab</option>
                    <option value="it_hardware">Technology</option>
                    <option value="sports">Sports</option>
                    <option value="medical">Medical</option>
                    <option value="textbooks">Textbooks</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Stock Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Purchase Request */}
      {isNewReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">New Purchase Request</h3>
              <button
                type="button"
                onClick={() => setIsNewReqOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Required</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 Reams of White Printing Paper"
                  value={reqItemName}
                  onChange={(e) => setReqItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Cost Per Unit (₦)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={reqCost}
                    onChange={(e) => setReqCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Urgency</label>
                <select
                  value={reqUrgency}
                  onChange={(e) => setReqUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                >
                  <option value="low">Routine (Low)</option>
                  <option value="medium">Standard (Medium)</option>
                  <option value="critical">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why this purchase is needed..."
                  value={reqJustification}
                  onChange={(e) => setReqJustification(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Requests above ₦100,000 will be forwarded to the Proprietor for capital approval.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReqOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
