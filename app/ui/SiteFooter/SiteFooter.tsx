import styles from './siteFooter.module.css';

export default function SiteFooter() {
	return (
		<footer className={styles.footer}>
			<div className='container'>
				<div className={styles.grid}>
					<div>
						<div className={styles.title}>Coral Shop</div>
						<div className={styles.muted}>
							Спокойный магазин кораллов без лишнего шума. Зато с нормальным
							сервисом.
						</div>
					</div>
					<div>
						<div className={styles.title}>Условия</div>
						<div className={styles.muted}>Оплата: перевод / крипта</div>
						<div className={styles.muted}>Доставка: Новая Почта</div>
					</div>
					<div>
						<div className={styles.title}>Контакт</div>
						<div className={styles.muted}>Telegram/Instagram</div>
					</div>
				</div>

				<div className={styles.bottom}>
					<div className={styles.muted}>
						© {new Date().getFullYear()} Coral Shop
					</div>
				</div>
			</div>
		</footer>
	);
}
