import { requireAdmin } from '@/lib/auth/admin';
import Link from 'next/link';
import AdminProductsClient from './ui/AdminProductsClient';

export default async function AdminProductsPage() {
	await requireAdmin();

	return (
		<main style={{ padding: 24 }}>
			<div
				style={{
					display: 'flex',
					gap: 12,
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<Link href='/admin'>← Админ</Link>
				<h1 style={{ margin: 0 }}>Товары</h1>
			</div>

			<div style={{ marginTop: 16 }}>
				<AdminProductsClient />
			</div>
		</main>
	);
}
