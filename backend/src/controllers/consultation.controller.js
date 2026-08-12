import { config } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const createConsultation = async (req, res) => {
  try {
    const { visit_id, mode = 'VIDEO' } = req.body;
    if (!visit_id) return res.status(400).json({ error: 'visit_id is required' });

    const roomId = `room_${visit_id.replace(/-/g, '_')}`;

    const consultRecord = {
      visit_id,
      doctor_id: req.user?.id || null,
      mode,
      status: 'QUEUED'
    };

    let { data: newConsult } = await supabaseAdmin.from('consultations').insert([consultRecord]).select().single();

    return res.status(201).json({
      consultation: newConsult || consultRecord,
      room_id: roomId,
      zego_app_id: parseInt(config.zegoCloud.appId || '1586356449')
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create consultation', details: error.message });
  }
};

export const startConsultation = async (req, res) => {
  try {
    const { id } = req.params; // consultation_id or visit_id

    const roomId = `room_${id.replace(/-/g, '_')}`;

    await supabaseAdmin.from('consultations').update({
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString()
    }).eq('id', id);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_STARTED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    return res.json({
      message: 'Consultation call started',
      consultation_id: id,
      room_id: roomId,
      zego_app_id: parseInt(config.zegoCloud.appId || '1586356449'),
      user_id: req.user?.id || `user_${Date.now()}`,
      user_name: req.user?.name || 'Doctor'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to start consultation', details: error.message });
  }
};

export const endConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_notes } = req.body;

    await supabaseAdmin.from('consultations').update({
      status: 'COMPLETED',
      ended_at: new Date().toISOString(),
      doctor_notes: doctor_notes || 'Teleconsultation completed.'
    }).eq('id', id);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_ENDED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    return res.json({ message: 'Consultation completed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to end consultation', details: error.message });
  }
};
