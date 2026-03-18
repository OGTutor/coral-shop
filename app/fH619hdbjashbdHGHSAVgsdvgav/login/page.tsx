'use client';

import { ADMIN_PREFIX } from '@/lib/auth/admin-path';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import s from './page.module.css';

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

		router.replace(ADMIN_PREFIX);
		router.refresh();
	}

	return (
		<main className={s.page}>
			<div className={s.bgOrbA} />
			<div className={s.bgOrbB} />

			<section className={s.card}>
				<div className={s.badge}>Admin Access</div>

				<h1 className={s.title}>Вход в админку</h1>
				<p className={s.subtitle}>Только для администратора магазина</p>

				<form onSubmit={onSubmit} className={s.form}>
					<div className={s.field}>
						<label className={s.label}>Email</label>
						<input
							type='email'
							placeholder='admin@example.com'
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
							className='input'
						/>
					</div>

					<div className={s.field}>
						<label className={s.label}>Пароль</label>
						<input
							type='password'
							placeholder='Введите пароль'
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							className='input'
						/>
					</div>

					<button
						type='submit'
						disabled={loading}
						className={`btn btnPrimary ${s.submit}`}
					>
						{loading ? 'Вхожу…' : 'Войти'}
					</button>

					{err ? <div className={s.error}>❌ {err}</div> : null}
				</form>
			</section>
		</main>
	);
}
