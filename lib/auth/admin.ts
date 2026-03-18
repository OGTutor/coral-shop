import { createAuthServerClient } from '@/lib/supabase/server-auth';
import { redirect } from 'next/navigation';
import { ADMIN_LOGIN_PATH } from './admin-path';

export async function requireAdmin() {
	const supabase = await createAuthServerClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		redirect(ADMIN_LOGIN_PATH);
	}

	const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
	const userEmail = user.email?.toLowerCase().trim();

	if (!adminEmail || !userEmail || userEmail !== adminEmail) {
		redirect(ADMIN_LOGIN_PATH);
	}

	return { supabase, user };
}
