import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET /api/inventory - Fetch institutional inventory and procurement requisitions
export async function GET() {
  try {
    const sb = getAdminClient();

    const [invRes, reqRes] = await Promise.all([
      sb.from('inventory_items').select('*').order('name', { ascending: true }),
      sb.from('procurement_requests').select('*').order('created_at', { ascending: false }),
    ]);

    if (invRes.error) throw invRes.error;
    if (reqRes.error) throw reqRes.error;

    const inventory = (invRes.data || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      quantity: Number(i.quantity),
      unit: i.unit || 'units',
      reorderLevel: Number(i.reorder_level) || 10,
      unitCost: Number(i.unit_cost) || 0,
      location: i.location || 'Central Store',
      status: i.status || (Number(i.quantity) <= Number(i.reorder_level || 10) ? 'low_stock' : 'in_stock'),
    }));

    const requests = (reqRes.data || []).map((r: any) => ({
      id: r.id,
      itemName: r.item_name,
      category: r.category,
      quantity: Number(r.quantity),
      unit: r.unit || 'units',
      estimatedUnitCost: Number(r.estimated_unit_cost) || 0,
      estimatedTotalCost: Number(r.estimated_total_cost) || (Number(r.quantity) * Number(r.estimated_unit_cost || 0)),
      urgency: r.urgency || 'medium',
      justification: r.justification || '',
      requestedByName: r.requested_by_name || 'Faculty Requester',
      status: r.status || 'pending_principal',
      approvedBy: r.approved_by || '',
      approvalNotes: r.approval_notes || '',
      createdAt: r.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      inventory,
      requests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch inventory records' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Add stock item or submit procurement requisition
export async function POST(req: NextRequest) {
  try {
    const sb = getAdminClient();
    const body = await req.json();
    const { action } = body;

    if (action === 'add_item') {
      const {
        name,
        category = 'stationery',
        quantity = 0,
        unit = 'units',
        reorderLevel = 10,
        unitCost = 0,
        location = 'Main Store',
      } = body;

      if (!name?.trim()) {
        return NextResponse.json({ success: false, message: 'Item name is required' }, { status: 400 });
      }

      const numQty = Number(quantity) || 0;
      const numReorder = Number(reorderLevel) || 10;
      const status = numQty <= 0 ? 'out_of_stock' : numQty <= numReorder ? 'low_stock' : 'in_stock';

      const { data, error } = await sb
        .from('inventory_items')
        .insert({
          name: name.trim(),
          category,
          quantity: numQty,
          unit: unit.trim(),
          reorder_level: numReorder,
          unit_cost: Number(unitCost) || 0,
          location: location.trim(),
          status,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Item "${data.name}" added to inventory`,
        item: {
          id: data.id,
          name: data.name,
          category: data.category,
          quantity: Number(data.quantity),
          unit: data.unit,
          reorderLevel: Number(data.reorder_level),
          unitCost: Number(data.unit_cost),
          location: data.location,
          status: data.status,
        },
      });
    }

    if (action === 'create_request') {
      const {
        itemName,
        category = 'stationery',
        quantity = 1,
        unit = 'units',
        estimatedUnitCost = 0,
        urgency = 'medium',
        justification = '',
        requestedByName = 'Head of School (Principal)',
      } = body;

      if (!itemName?.trim()) {
        return NextResponse.json({ success: false, message: 'Item name is required' }, { status: 400 });
      }

      const numQty = Number(quantity) || 1;
      const numUnitCost = Number(estimatedUnitCost) || 0;
      const totalCost = numQty * numUnitCost;

      const { data, error } = await sb
        .from('procurement_requests')
        .insert({
          item_name: itemName.trim(),
          category,
          quantity: numQty,
          unit: unit.trim(),
          estimated_unit_cost: numUnitCost,
          estimated_total_cost: totalCost,
          urgency,
          justification: justification.trim(),
          requested_by_name: requestedByName.trim(),
          status: 'pending_principal',
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Procurement request submitted for "${data.item_name}"`,
        request: {
          id: data.id,
          itemName: data.item_name,
          category: data.category,
          quantity: Number(data.quantity),
          unit: data.unit,
          estimatedUnitCost: Number(data.estimated_unit_cost),
          estimatedTotalCost: Number(data.estimated_total_cost),
          urgency: data.urgency,
          justification: data.justification,
          requestedByName: data.requested_by_name,
          status: data.status,
          createdAt: data.created_at,
        },
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Inventory operation failed' },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory - Adjust stock, approve/reject requisitions, or record delivery
export async function PATCH(req: NextRequest) {
  try {
    const sb = getAdminClient();
    const body = await req.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Item or request ID required' }, { status: 400 });
    }

    if (action === 'adjust_stock') {
      const { quantity } = body;
      const numQty = Math.max(0, Number(quantity) || 0);

      // Fetch existing item for reorder_level
      const { data: item } = await sb.from('inventory_items').select('reorder_level').eq('id', id).single();
      const reorderLevel = item ? Number(item.reorder_level) : 10;
      const status = numQty === 0 ? 'out_of_stock' : numQty <= reorderLevel ? 'low_stock' : 'in_stock';

      const { data, error } = await sb
        .from('inventory_items')
        .update({
          quantity: numQty,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Stock quantity updated',
        item: {
          id: data.id,
          name: data.name,
          category: data.category,
          quantity: Number(data.quantity),
          unit: data.unit,
          reorderLevel: Number(data.reorder_level),
          unitCost: Number(data.unit_cost),
          location: data.location,
          status: data.status,
        },
      });
    }

    if (action === 'approve_request') {
      const decision = body.decision === 'rejected' ? 'rejected' : 'approved';
      const approverName = body.approverName || 'Mr Seyi Bankole (Principal)';
      const notes = body.notes || (decision === 'approved' ? 'Approved for bursary disbursement' : 'Declined by Principal');

      const { data, error } = await sb
        .from('procurement_requests')
        .update({
          status: decision,
          approved_by: approverName,
          approval_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Request ${decision === 'approved' ? 'approved' : 'rejected'} successfully`,
        request: {
          id: data.id,
          itemName: data.item_name,
          status: data.status,
          approvedBy: data.approved_by,
          approvalNotes: data.approval_notes,
        },
      });
    }

    if (action === 'mark_delivered') {
      // 1. Mark request delivered
      const { data: reqData, error: reqErr } = await sb
        .from('procurement_requests')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (reqErr) throw reqErr;

      // 2. Replenish inventory stock
      if (reqData) {
        const { data: existingItems } = await sb
          .from('inventory_items')
          .select('*')
          .ilike('name', reqData.item_name.trim());

        if (existingItems && existingItems.length > 0) {
          const match = existingItems[0];
          const newQty = Number(match.quantity) + Number(reqData.quantity);
          const newStatus = newQty <= Number(match.reorder_level) ? 'low_stock' : 'in_stock';

          await sb
            .from('inventory_items')
            .update({
              quantity: newQty,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', match.id);
        } else {
          await sb.from('inventory_items').insert({
            name: reqData.item_name,
            category: reqData.category || 'stationery',
            quantity: Number(reqData.quantity),
            unit: reqData.unit || 'units',
            reorder_level: 10,
            unit_cost: Number(reqData.estimated_unit_cost) || 0,
            location: 'Central Store',
            status: 'in_stock',
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Items received and added to inventory ledger`,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Inventory update failed' },
      { status: 500 }
    );
  }
}
