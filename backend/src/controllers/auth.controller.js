import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log(`🔑 Login attempt for: ${email} (Role requested: ${role || 'Any'})`);

    // 1. Check if profile exists in database
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Auto-seed demo accounts if database profile is not found
    if (!profile) {
      const defaultRole = role || (email.includes('doctor') ? 'DOCTOR' : email.includes('admin') ? 'ADMIN' : 'CLINIC_ASSISTANT');
      const defaultName = defaultRole === 'DOCTOR' ? 'Dr. Rajesh Verma (MD)' : defaultRole === 'ADMIN' ? 'Dr. Ananya Sen (Admin)' : 'Sunita Devi (Assistant)';
      
      const { data: newProfile, error: seedErr } = await supabaseAdmin
        .from('profiles')
        .insert([{
          email: email.toLowerCase().trim(),
          name: defaultName,
          role: defaultRole,
          phone: '+91 9876543210',
          status: 'ACTIVE'
        }])
        .select()
        .single();
        
      if (!seedErr && newProfile) {
        profile = newProfile;
      }
    }

    if (!profile) {
      // Fallback in-memory user profile
      profile = {
        id: 'p0000000-0000-0000-0000-000000000001',
        email: email.toLowerCase(),
        name: role === 'DOCTOR' ? 'Dr. Rajesh Verma' : role === 'ADMIN' ? 'Health Admin' : 'Sunita Devi',
        role: role || 'CLINIC_ASSISTANT'
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    await logAuditEvent({
      actorId: profile.id,
      actorRole: profile.role,
      action: 'USER_LOGIN',
      entityType: 'PROFILES',
      entityId: profile.id,
      metadata: { email: profile.email, role: profile.role }
    });

    return res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        phone: profile.phone
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Server error during authentication', details: error.message });
  }
};

export const logout = async (req, res) => {
  if (req.user) {
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'PROFILES',
      entityId: req.user.id
    });
  }
  return res.json({ message: 'Successfully logged out' });
};

export const getMe = async (req, res) => {
  return res.json({ user: req.user });
};
