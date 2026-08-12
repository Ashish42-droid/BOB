import { supabaseAdmin } from '../config/supabase.js';

export const logAuditEvent = async ({ actorId, actorRole, action, entityType, entityId, metadata = {} }) => {
  try {
    const auditRecord = {
      actor_id: actorId || null,
      actor_role: actorRole || 'SYSTEM',
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata,
      created_at: new Date().toISOString()
    };

    console.log(`📌 AUDIT LOG [${action}]:`, auditRecord);

    await supabaseAdmin.from('audit_logs').insert([auditRecord]);
  } catch (err) {
    console.error('Failed to insert audit log:', err.message);
  }
};
