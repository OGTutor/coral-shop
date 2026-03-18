'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLogin() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [err, setErr] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErr(null);
		setLoading(true);

		const supabase = supabaseBrowser();
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		setLoading(false);

		if (error) {
			setErr(error.message);
			return;
		}

		router.replace('/admin'); // ✅ replace лучше, чем push
		router.refresh(); // ✅ обновит RSC/SSR и подтянет cookies
	}

	return (
		<main style={{ padding: 24 }}>
			<h1>Admin Login</h1>

			<form
				onSubmit={onSubmit}
				style={{ display: 'grid', gap: 8, maxWidth: 320 }}
			>
				<input
					type='email'
					placeholder='Email'
					value={email}
					onChange={e => setEmail(e.target.value)}
					required
				/>
				<input
					type='password'
					placeholder='Password'
					value={password}
					onChange={e => setPassword(e.target.value)}
					required
				/>

				<button type='submit' disabled={loading}>
					{loading ? 'Вхожу…' : 'Login'}
				</button>

				{err && <div style={{ color: 'crimson' }}>{err}</div>}
			</form>
		</main>
	);
}
