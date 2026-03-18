import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

type PageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ q?: string; stock?: string; sort?: string }>;
};

export default async function CategoryPage(props: PageProps) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const slug = params.slug;
	if (!slug) notFound();

	const q = (searchParams.q ?? '').toString();
	const stock = (searchParams.stock ?? '').toString();
	const sort = (searchParams.sort ?? 'new').toString();

	const sb = supabaseServer();

	const { data: cat, error } = await sb
		.from('categories')
		.select('id,name')
		.eq('slug', slug)
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!cat) notFound();

	let query = sb
		.from('products')
		.select('id,title,price_uah,image_url,in_stock,created_at')
		.eq('category_id', cat.id);

	if (q) query = query.ilike('title', `%${q}%`);
	if (stock === '1') query = query.eq('in_stock', true);

	if (sort === 'price_asc')
		query = query.order('price_uah', { ascending: true });
	else if (sort === 'price_desc')
		query = query.order('price_uah', { ascending: false });
	else query = query.order('created_at', { ascending: false });

	const products = await query;
	if (products.error) throw new Error(products.error.message);

	return (
		<main className='container'>
			<div className={styles.top}>
				<Link href='/' className={styles.back}>
					← На главную
				</Link>
				<div className={styles.head}>
					<h1 className={styles.h1}>{cat.name}</h1>
					<div className={styles.sub}>
						Фильтры справа — чтобы быстро найти нужное.
					</div>
				</div>
			</div>

			<form className={styles.filters}>
				<input
					className='input'
					name='q'
					defaultValue={q}
					placeholder='Поиск по названию…'
				/>

				<label className={styles.check}>
					<input
						type='checkbox'
						name='stock'
						value='1'
						defaultChecked={stock === '1'}
					/>
					<span>В наличии</span>
				</label>

				<select name='sort' defaultValue={sort}>
					<option value='new'>Сначала новые</option>
					<option value='price_asc'>Цена ↑</option>
					<option value='price_desc'>Цена ↓</option>
				</select>

				<button className='btn btnPrimary' type='submit'>
					Применить
				</button>
			</form>

			<div className={styles.grid}>
				{products.data?.map(p => (
					<Link key={p.id} href={`/p/${p.id}`} className={styles.card}>
						<div className={styles.thumb}>
							{p.image_url ? (
								<img src={p.image_url} alt={p.title} loading='lazy' />
							) : (
								<div className={styles.thumbEmpty} />
							)}
							<div
								className={`${styles.stock} ${
									p.in_stock ? styles.in : styles.out
								}`}
							>
								{p.in_stock ? 'В наличии' : 'Нет в наличии'}
							</div>
						</div>

						<div className={styles.cardBody}>
							<div className={styles.title}>{p.title}</div>
							<div className={styles.price}>{p.price_uah} ₴</div>
						</div>
					</Link>
				))}
			</div>
		</main>
	);
}
