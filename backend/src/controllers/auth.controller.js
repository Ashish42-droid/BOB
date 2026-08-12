import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

const ROLE_DB_TO_API = {
  clinic_assistant: 'CLINIC_ASSISTANT',
  doctor: 'DOCTOR',
  admin: 'ADMIN'
};
const ROLE_API_TO_DB = {
  CLINIC_ASSISTANT: 'clinic_assistant',
  DOCTOR: 'doctor',
  ADMIN: 'admin'
};

const issueToken = (profile) =>
  jwt.sign(
    {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: ROLE_DB_TO_API[profile.role] || 'CLINIC_ASSISTANT'
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

const publicUser = (profile) => ({
  id: profile.id,
  email: profile.email,
  name: profile.full_name,
  role: ROLE_DB_TO_API[profile.role] || 'CLINIC_ASSISTANT',
  phone: profile.phone
});

/**
 * POST /api/auth/login  { email, password }
 * Password is verified against Supabase Auth. The role always comes from the
 * staff_profiles table — it can never be chosen by the client.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify the password with Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (authErr || !authData?.user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 2. Load the staff profile (source of truth for role)
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profErr || !profile) {
      return res.status(403).json({
        error: 'No staff profile is linked to this account. Ask an administrator to register you.'
      });
    }

    if (profile.status !== 'active') {
      return res.status(403).json({ error: `This account is ${profile.status}. Contact an administrator.` });
    }

    const token = issueToken(profile);

    await logAuditEvent({
      actorId: profile.id,
      actorRole: ROLE_DB_TO_API[profile.role],
      action: 'USER_LOGIN',
      entityType: 'STAFF_PROFILES',
      entityId: profile.id,
      metadata: { email: profile.email }
    });

    return res.json({ token, user: publicUser(profile) });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Server error during authentication', details: error.message });
  }
};

/**
 * POST /api/auth/register
 * { email, password, full_name, role, phone, registration_number?, specialization?, qualification? }
 * Creates a Supabase Auth user (password holder) + staff_profiles row.
 * Doctors also get a doctor_profiles row with their medical registration number.
 */
export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      role = 'CLINIC_ASSISTANT',
      phone,
      registration_number,
      specialization,
      qualification
    } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password and full_name are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const dbRole = ROLE_API_TO_DB[role];
    if (!dbRole) {
      return res.status(400).json({ error: `Invalid role '${role}'. Allowed: CLINIC_ASSISTANT, DOCTOR, ADMIN.` });
    }
    if (dbRole === 'doctor' && !registration_number) {
      return res.status(400).json({ error: 'Doctors must provide their medical council registration_number.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Reject duplicate staff profile up front
    const { data: existing } = await supabaseAdmin
      .from('staff_profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    // 1. Create the Supabase Auth user (stores the password securely)
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: dbRole }
    });

    if (authErr && !/already.*(registered|exists)/i.test(authErr.message)) {
      return res.status(400).json({ error: `Account creation failed: ${authErr.message}` });
    }

    // 2. Create the staff profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('staff_profiles')
      .insert([{ full_name, role: dbRole, email: cleanEmail, phone: phone || null, status: 'active' }])
      .select()
      .single();

    if (profErr) {
      // Roll back the auth user so the email is not left half-registered
      if (created?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      }
      return res.status(500).json({ error: `Staff profile creation failed: ${profErr.message}` });
    }

    // 3. Doctor credentials
    if (dbRole === 'doctor') {
      const { error: docErr } = await supabaseAdmin.from('doctor_profiles').insert([{
        staff_id: profile.id,
        registration_number,
        specialization: specialization || 'General Medicine',
        qualification: qualification || null
      }]);
      if (docErr) {
        console.warn('doctor_profiles insert warning:', docErr.message);
      }
    }

    const token = issueToken(profile);

    await logAuditEvent({
      actorId: profile.id,
      actorRole: ROLE_DB_TO_API[profile.role],
      action: 'USER_REGISTERED',
      entityType: 'STAFF_PROFILES',
      entityId: profile.id,
      metadata: { email: profile.email, role: profile.role }
    });

    return res.status(201).json({ token, user: publicUser(profile) });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ error: 'Server error during registration', details: error.message });
  }
};

export const logout = async (req, res) => {
  if (req.user) {
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'STAFF_PROFILES',
      entityId: req.user.id
    });
  }
  return res.json({ message: 'Successfully logged out' });
};

export const getMe = async (req, res) => {
  return res.json({ user: req.user });
};
