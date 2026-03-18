'use client';

import { useState } from 'react';
import styles from './OrderForm.module.css';

export default function OrderForm({
	product,
	disabled,
}: {
	product: { id: string; title: string; price: number };
	disabled?: boolean;
}) {
	const [loading, setLoading] = useState(false);
	const [ok, setOk] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setOk(null);
		setErr(null);
		setLoading(true);

		const fd = new FormData(e.currentTarget);

		const payload = {
			items: [
				{
					productId: product.id,
					title: product.title,
					price: product.price,
					qty: 1,
				},
			],
			customerName: String(fd.get('customerName') || ''),
			phone: String(fd.get('phone') || ''),
			city: String(fd.get('city') || ''),
			shipping: String(fd.get('shipping') || ''),
			comment: String(fd.get('comment') || ''),
		};

		try {
			const r = await fetch('/api/order', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const j = await r.json();
			if (!r.ok)
				throw new Error(j?.error?.formErrors?.[0] || j?.error || 'Ошибка');

			setOk(j.id);
			(e.target as HTMLFormElement).reset();
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : 'Ошибка';
			setErr(message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className={styles.form}>
			<div className={styles.grid}>
				<input
					className='input'
					name='customerName'
					placeholder='Имя'
					required
					disabled={disabled}
				/>
				<input
					className='input'
					name='phone'
					placeholder='Телефон'
					required
					disabled={disabled}
				/>
				<input
					className='input'
					name='city'
					placeholder='Город'
					required
					disabled={disabled}
				/>
				<input
					className='input'
					name='shipping'
					placeholder='НП: отделение/почтомат/адрес'
					required
					disabled={disabled}
				/>
				<textarea
					className='input'
					name='comment'
					placeholder='Комментарий (опционально)'
					disabled={disabled}
					rows={3}
				/>
			</div>

			<button
				className='btn btnPrimary'
				type='submit'
				disabled={disabled || loading}
			>
				{disabled
					? 'Нет в наличии'
					: loading
						? 'Отправляю…'
						: 'Отправить заявку'}
			</button>

			{ok ? (
				<div className={styles.ok}>✅ Заявка отправлена. ID: {ok}</div>
			) : null}
			{err ? <div className={styles.err}>❌ {err}</div> : null}
		</form>
	);
}
