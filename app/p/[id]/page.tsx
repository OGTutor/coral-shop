import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import OrderForm from './ui/OrderForm';

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function ProductPage(props: PageProps) {
	const params = await props.params;
	const id = params?.id;

	if (!id) notFound();

	const sb = supabaseServer();

	const { data: p, error } = await sb
		.from('products')
		.select('id,title,price_uah,image_url,in_stock,description,category_id')
		.eq('id', id)
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!p) notFound();

	return (
		<main className='container'>
			<Link href='/' className={styles.back}>
				← На главную
			</Link>

			<section className={styles.wrap}>
				<div className={styles.media}>
					<div className={styles.image}>
						{p.image_url ? (
							<img src={p.image_url} alt={p.title} />
						) : (
							<div className={styles.imageEmpty} />
						)}
					</div>
				</div>

				<div className={styles.content}>
					<div className={styles.head}>
						<h1 className={styles.h1}>{p.title}</h1>

						<div className={styles.priceRow}>
							<div className={styles.price}>{p.price_uah} ₴</div>
							<span
								className={`${styles.stock} ${p.in_stock ? styles.in : styles.out}`}
							>
								{p.in_stock ? 'В наличии' : 'Нет в наличии'}
							</span>
						</div>

						{p.description ? (
							<p className={styles.desc}>{p.description}</p>
						) : (
							<p className={styles.descMuted}>
								Описание добавим — но товар уже можно оформить.
							</p>
						)}
					</div>

					<div className={styles.order}>
						<div className={styles.orderTitle}>Оформить заказ</div>
						<div className={styles.orderSub}>
							Заполни поля — заявка уйдёт в систему. Никакой магии, только
							работа.
						</div>

						<OrderForm
							product={{ id: p.id, title: p.title, price: p.price_uah }}
							disabled={!p.in_stock}
						/>
					</div>
				</div>
			</section>
		</main>
	);
}
