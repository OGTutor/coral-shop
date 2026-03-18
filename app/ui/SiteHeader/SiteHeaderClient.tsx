'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from './siteHeader.module.css';

type Category = {
	slug: string;
	name: string;
};

export default function SiteHeaderClient({ cats }: { cats: Category[] }) {
	const [open, setOpen] = useState(false);

	return (
		<header className={styles.header}>
			<div className='container'>
				<div className={styles.row}>
					<Link href='/' className={styles.brand} aria-label='На главную'>
						<div className={styles.logoBox}>
							<Image
								src='/brand/Logo.svg'
								width={42}
								height={42}
								alt='Логотип Coral Shop'
							/>
						</div>

						<div className={styles.brandText}>
							<div className={styles.brandTitle}>Coral Shop</div>
							<div className={styles.brandSub}>Кораллы • Украина</div>
						</div>
					</Link>

					<nav className={styles.nav} aria-label='Категории'>
						{cats?.slice(0, 6).map(c => (
							<Link
								key={c.slug}
								href={`/c/${c.slug}`}
								className={styles.navLink}
							>
								{c.name}
							</Link>
						))}
					</nav>

					<div className={styles.actions}>
						<Link className='btn' href='/'>
							Каталог
						</Link>

						<button
							type='button'
							className={styles.burger}
							onClick={() => setOpen(v => !v)}
							aria-label='Открыть меню'
							aria-expanded={open}
						>
							<span />
							<span />
							<span />
						</button>
					</div>
				</div>

				{open ? (
					<div className={styles.mobileMenu}>
						<div className={styles.mobileMenuInner}>
							<Link
								href='/'
								className={styles.mobileLink}
								onClick={() => setOpen(false)}
							>
								Каталог
							</Link>

							{cats?.map(c => (
								<Link
									key={c.slug}
									href={`/c/${c.slug}`}
									className={styles.mobileLink}
									onClick={() => setOpen(false)}
								>
									{c.name}
								</Link>
							))}
						</div>
					</div>
				) : null}
			</div>
		</header>
	);
}
