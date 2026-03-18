import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';
import styles from './page.module.css';

export default async function Home() {
	const sb = supabaseServer();
	const { data: cats, error } = await sb
		.from('categories')
		.select('slug,name')
		.order('name');
	if (error) throw new Error(error.message);

	return (
		<main className='container'>
			<section className={styles.hero}>
				<div className={styles.heroLeft}>
					<div className={styles.pill}>
						<span className='kbd'>Live</span>
						<span>Свежие позиции • Быстрая отправка</span>
					</div>

					<h1 className={styles.h1}>
						Кораллы для рифа — аккуратно, красиво, без суеты.
					</h1>

					<p className={styles.lead}>
						Витрина с категориями и наличием. Оформление заявки занимает меньше
						минуты (да, это намёк).
					</p>

					<div className={styles.ctaRow}>
						<a className='btn btnPrimary' href='#cats'>
							Открыть каталог
						</a>
						<div className={styles.meta}>
							<div className={styles.metaItem}>Оплата: перевод / крипта</div>
							<div className={styles.metaDot} />
							<div className={styles.metaItem}>Доставка: Новая Почта</div>
						</div>
					</div>
				</div>

				<div className={styles.heroRight}>
					<div className={styles.previewCard}>
						<div className={styles.previewTop}>
							<div className={styles.previewTitle}>
								Подбор под твой аквариум
							</div>
							<div className={styles.previewMuted}>
								LPS • SPS • Soft • Zoanthus
							</div>
						</div>

						<div className={styles.previewGrid}>
							<div className={styles.previewTile} />
							<div className={styles.previewTile} />
							<div className={styles.previewTile} />
							<div className={styles.previewTile} />
						</div>

						<div className={styles.previewBottom}>
							<span className='badge'>Качество</span>
							<span className='badge'>Наличие</span>
							<span className='badge'>Упаковка</span>
						</div>
					</div>
				</div>
			</section>

			<section id='cats' className={styles.section}>
				<div className={styles.sectionHead}>
					<h2 className={styles.h2}>Категории</h2>
					<div className={styles.sub}>
						Выбирай категорию — дальше будет поиск, сортировка и карточки
						товаров.
					</div>
				</div>

				<div className={styles.grid}>
					{cats?.map(c => (
						<Link key={c.slug} href={`/c/${c.slug}`} className={styles.catCard}>
							<div className={styles.catTop}>
								<div className={styles.catName}>{c.name}</div>
								<div className={styles.arrow}>→</div>
							</div>
							<div className={styles.catDesc}>
								Открыть витрину и посмотреть позиции
							</div>
						</Link>
					))}
				</div>
			</section>

			<section className={styles.section}>
				<div className={styles.info}>
					<div className={styles.infoCard}>
						<div className={styles.infoTitle}>Доставка</div>
						<div className={styles.infoText}>
							Новая Почта: отделение/почтомат/адрес. Упаковка — по-человечески.
						</div>
					</div>
					<div className={styles.infoCard}>
						<div className={styles.infoTitle}>Оплата</div>
						<div className={styles.infoText}>
							Перевод или крипта. Быстро, прозрачно, без “ой, щас уточню”.
						</div>
					</div>
					<div className={styles.infoCard}>
						<div className={styles.infoTitle}>Поддержка</div>
						<div className={styles.infoText}>
							Если нужно — добавь контакт в футере (TG/IG) и будет идеально.
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
