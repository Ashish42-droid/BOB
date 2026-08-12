import { supabaseAdmin } from '../config/supabase.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

export const logAuditEvent = async ({ actorId, actorRole, action, entityType, entityId, metadata = {} }) => {
  try {
    // Matches the live audit_logs schema:
    // actor_id UUID | action | entity_type | entity_id UUID | old_data | new_data | ip_address
    const auditRecord = {
      actor_id: asUuid(actorId),
      action,
      entity_type: entityType,
      entity_id: asUuid(entityId),
      new_data: { ...metadata, actor_role: actorRole || 'SYSTEM' }
    };

    console.log(`📌 AUDIT [${action}] ${entityType}${auditRecord.entity_id ? ` #${auditRecord.entity_id}` : ''}`);

    const { error } = await supabaseAdmin.from('audit_logs').insert([auditRecord]);
    if (error) console.warn('Audit log insert failed:', error.message);
  } catch (err) {
    console.error('Failed to insert audit log:', err.message);
  }
};
