import { requireAdmin } from '@/lib/auth/admin';
import { ADMIN_PREFIX } from '@/lib/auth/admin-path';
import Link from 'next/link';
import s from '../admin.module.css';
import AdminProductsClient from './ui/AdminProductsClient';

export default async function AdminProductsPage() {
	await requireAdmin();

	return (
		<main className={s.page}>
			<div className={s.container}>
				<section className={s.topbar}>
					<div className={s.topbarLeft}>
						<div className={s.eyebrow}>Products</div>
						<h1 className={s.title}>Товары</h1>
						<p className={s.subtitle}>
							Добавляй, редактируй, обновляй фото и держи каталог в порядке.
						</p>
					</div>

					<div className={s.topbarActions}>
						<Link href={ADMIN_PREFIX} className={s.btn}>
							← Назад в админку
						</Link>
						<Link href='/' className={s.btn}>
							Открыть магазин
						</Link>
					</div>
				</section>

				<AdminProductsClient />
			</div>
		</main>
	);
}
