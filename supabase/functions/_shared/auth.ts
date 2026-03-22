/**
 * supabase/functions/_shared/auth.ts
 * Verifies the Bearer JWT from an incoming request.
 * Returns the authenticated User or throws on invalid/missing token.
 */
// deno-lint-ignore-file

import { createAdminClient } from './supabaseAdmin.ts';
import type { User } from '@supabase/supabase-js';

/**
 * Validates the Authorization header and returns the Supabase User.
 * Throws if the token is absent, invalid, or expired.
 */
export const verifyUser = async (req: Request): Promise<User> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header.');
  if (!authHeader.startsWith('Bearer '))
    throw new Error('Invalid Authorization header format.');

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) throw new Error('Empty Bearer token.');

  const supabase = createAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error('Auth verification error:', error.message);
    throw new Error('Invalid or expired token.');
  }

  if (!user) {
    throw new Error('User not found.');
  }

  return user;
};
