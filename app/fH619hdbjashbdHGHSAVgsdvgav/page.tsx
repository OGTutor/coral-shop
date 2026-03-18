import { requireAdmin } from '@/lib/auth/admin';
import { ADMIN_PRODUCTS_PATH } from '@/lib/auth/admin-path';
import Link from 'next/link';
import s from './admin.module.css';

export default async function AdminPage() {
	const { user } = await requireAdmin();

	return (
		<main className={s.page}>
			<div className={s.container}>
				<section className={s.topbar}>
					<div className={s.topbarLeft}>
						<div className={s.eyebrow}>Admin Panel</div>
						<h1 className={s.title}>Админ панель</h1>
						<p className={s.subtitle}>
							Вы вошли как: <strong>{user.email}</strong>
						</p>
					</div>

					<div className={s.topbarActions}>
						<Link
							href={ADMIN_PRODUCTS_PATH}
							className={`${s.btn} ${s.btnPrimary}`}
						>
							Открыть товары
						</Link>
						<Link href='/' className={s.btn}>
							Открыть магазин
						</Link>
					</div>
				</section>

				<section className={`${s.card} ${s.cardPad}`}>
					<h2 className={s.cardTitle}>Управление магазином</h2>
					<p className={s.cardText}>
						Отсюда заходишь в товары, добавляешь новые позиции, меняешь
						описание, цену, наличие и изображения.
					</p>
				</section>
			</div>
		</main>
	);
}
