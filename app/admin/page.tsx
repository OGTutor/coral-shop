import { requireAdmin } from '@/lib/auth/admin';
import Link from 'next/link';

export default async function AdminPage() {
	const { user } = await requireAdmin();

	return (
		<main style={{ padding: 24 }}>
			<h1>Админ панель</h1>
			<p>Вы вошли как: {user.email}</p>

			<div
				style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}
			>
				<Link href='/admin/products'>Товары</Link>
				<Link href='/'>Открыть магазин</Link>
			</div>
		</main>
	);
}
