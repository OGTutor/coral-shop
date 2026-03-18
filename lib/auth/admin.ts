import { createAuthServerClient } from '@/lib/supabase/server-auth';
import { redirect } from 'next/navigation';

export async function requireAdmin() {
	const supabase = await createAuthServerClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		redirect('/admin/login');
	}

	const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
	const userEmail = user.email?.toLowerCase().trim();

	if (!adminEmail || !userEmail || userEmail !== adminEmail) {
		redirect('/admin/login');
	}

	return { supabase, user };
}
