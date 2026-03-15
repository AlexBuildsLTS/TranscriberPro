import { createAdminClient } from './supabaseAdmin.ts';

import { User } from 'https://esm.sh/@supabase/supabase-js@2.38.4'; // Import User type
/**
 * Security Layer: Validates the JWT from the request and returns the User object.
 * This ensures that only authenticated SkillSprint users can trigger
 * sensitive Edge Functions like video processing or insight generation.
 */

// Utility to verify the user calling the function is authenticated
export const verifyUser = async (req: Request): Promise<User> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  const supabase = createAdminClient();
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) throw new Error('Invalid or expired token');
  return user;
};
