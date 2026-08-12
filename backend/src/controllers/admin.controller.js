import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

const ROLE_DB_TO_API = { clinic_assistant: 'CLINIC_ASSISTANT', doctor: 'DOCTOR', admin: 'ADMIN' };
const ROLE_API_TO_DB = { CLINIC_ASSISTANT: 'clinic_assistant', DOCTOR: 'doctor', ADMIN: 'admin' };

export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff_profiles')
      .select('*, doctor_profiles(registration_number, specialization, qualification)')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to load staff accounts', details: error.message });
    }

    return res.json((data || []).map((u) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: ROLE_DB_TO_API[u.role] || u.role,
      status: (u.status || 'active').toUpperCase(),
      qualifications: u.doctor_profiles?.qualification || null,
      specialization: u.doctor_profiles?.specialization || null,
      registration_number: u.doctor_profiles?.registration_number || null,
      created_at: u.created_at
    })));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, name, role, phone, password, registration_number, specialization, qualification } = req.body;
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'email, name, and role are required' });
    }
    const dbRole = ROLE_API_TO_DB[role];
    if (!dbRole) {
      return res.status(400).json({ error: `Invalid role '${role}'.` });
    }

    // Auth account (default password must be changed by the user)
    const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password || 'ChangeMe@123',
      email_confirm: true,
      user_metadata: { full_name: name, role: dbRole }
    });
    if (authErr && !/already.*(registered|exists)/i.test(authErr.message)) {
      return res.status(400).json({ error: `Auth account creation failed: ${authErr.message}` });
    }

    const { data: newUser, error } = await supabaseAdmin
      .from('staff_profiles')
      .insert([{ email: email.toLowerCase().trim(), full_name: name, role: dbRole, phone: phone || null, status: 'active' }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Staff profile creation failed', details: error.message });
    }

    if (dbRole === 'doctor') {
      const { error: docErr } = await supabaseAdmin.from('doctor_profiles').insert([{
        staff_id: newUser.id,
        registration_number: registration_number || `PENDING-${Date.now()}`,
        specialization: specialization || 'General Medicine',
        qualification: qualification || null
      }]);
      if (docErr) console.warn('doctor_profiles insert warning:', docErr.message);
    }

    logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'ADMIN_CREATED_USER',
      entityType: 'STAFF_PROFILES',
      entityId: newUser.id,
      metadata: { email, role }
    });

    return res.status(201).json({ ...newUser, name: newUser.full_name, role: ROLE_DB_TO_API[newUser.role] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getProtocols = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clinical_protocols')
      .select('*, clinical_protocol_steps(step_number, instruction)')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to load clinical protocols', details: error.message });
    }

    return res.json((data || []).map((p) => ({
      id: p.id,
      protocol_code: p.protocol_code,
      name: p.title,
      category: p.category,
      version: p.version,
      content: p.description,
      steps: (p.clinical_protocol_steps || []).sort((a, b) => a.step_number - b.step_number).map((s) => s.instruction),
      source: `${p.source_organization} — ${p.source_document}`,
      status: p.is_active ? 'ACTIVE' : 'INACTIVE',
      created_at: p.created_at
    })));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createProtocol = async (req, res) => {
  try {
    const { name, category, content, steps = [], source_organization = 'Ministry of Health & Family Welfare, Govt of India' } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: 'name and content are required' });
    }

    const { data: newProtocol, error } = await supabaseAdmin
      .from('clinical_protocols')
      .insert([{
        protocol_code: `CUSTOM-${Date.now()}`,
        title: name,
        category: category || 'General Medicine',
        description: content,
        source_organization,
        source_document: 'Admin-entered protocol',
        version: '1.0',
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Protocol creation failed', details: error.message });
    }

    if (Array.isArray(steps) && steps.length > 0) {
      const { error: stepErr } = await supabaseAdmin.from('clinical_protocol_steps').insert(
        steps.map((instruction, i) => ({ protocol_id: newProtocol.id, step_number: i + 1, instruction }))
      );
      if (stepErr) console.warn('protocol steps insert warning:', stepErr.message);
    }

    logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'ADMIN_CREATED_PROTOCOL',
      entityType: 'CLINICAL_PROTOCOLS',
      entityId: newProtocol.id
    });

    return res.status(201).json(newProtocol);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ error: 'Failed to load audit logs', details: error.message });
    }

    return res.json((data || []).map((l) => ({
      ...l,
      actor_role: l.new_data?.actor_role || 'SYSTEM'
    })));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [patients, visitsToday, waiting, highRisk, completed, consultationsDone, doctors] = await Promise.all([
      supabaseAdmin.from('patients').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_doctor'),
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).eq('risk_level', 'high').neq('status', 'completed'),
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabaseAdmin.from('staff_profiles').select('full_name, email, phone, status, doctor_profiles!inner(specialization, qualification)').eq('role', 'doctor')
    ]);

    const [lowCount, medCount, highCount] = await Promise.all([
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).eq('risk_level', 'low'),
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).eq('risk_level', 'medium'),
      supabaseAdmin.from('visits').select('*', { count: 'exact', head: true }).eq('risk_level', 'high')
    ]);

    const total = (lowCount.count || 0) + (medCount.count || 0) + (highCount.count || 0);
    const pct = (n) => (total > 0 ? Math.round(((n || 0) / total) * 100) : 0);

    return res.json({
      total_patients: patients.count || 0,
      today_patients: visitsToday.count || 0,
      waiting_for_doctor: waiting.count || 0,
      high_risk_cases: highRisk.count || 0,
      completed_visits: completed.count || 0,
      completed_consultations: consultationsDone.count || 0,
      risk_distribution: {
        LOW: { count: lowCount.count || 0, percentage: pct(lowCount.count), label: 'Low risk — protocol first-aid care' },
        MEDIUM: { count: medCount.count || 0, percentage: pct(medCount.count), label: 'Medium risk — doctor review required' },
        HIGH: { count: highCount.count || 0, percentage: pct(highCount.count), label: 'High risk — urgent doctor / referral' }
      },
      active_doctors: (doctors.data || []).map((d) => ({
        name: d.full_name,
        email: d.email,
        phone: d.phone,
        status: (d.status || 'active').toUpperCase(),
        specialization: d.doctor_profiles?.specialization,
        qualifications: d.doctor_profiles?.qualification
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to compute analytics', details: error.message });
  }
};
