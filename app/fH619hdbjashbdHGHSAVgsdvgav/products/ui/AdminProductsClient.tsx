'use client';

import { ADMIN_LOGIN_PATH } from '@/lib/auth/admin-path';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import s from '../../admin.module.css';

type Category = {
	id: string;
	slug: string;
	name: string;
};

type Product = {
	id: string;
	title: string;
	price_uah: number;
	in_stock: boolean;
	image_url: string | null;
	image_path: string | null;
	description: string | null;
	tags: string[] | null;
	created_at: string;
	category_id: string;
};

type ProductDraft = {
	title: string;
	price_uah: string;
	in_stock: boolean;
	description: string;
	tags: string;
	category_id: string;
};

function slugifyFileName(name: string) {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

function buildDraft(p: Product): ProductDraft {
	return {
		title: p.title ?? '',
		price_uah: String(p.price_uah ?? ''),
		in_stock: !!p.in_stock,
		description: p.description ?? '',
		tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
		category_id: p.category_id ?? '',
	};
}

export default function AdminProductsClient() {
	const supabase = useMemo(() => supabaseBrowser(), []);
	const router = useRouter();

	const [cats, setCats] = useState<Category[]>([]);
	const [items, setItems] = useState<Product[]>([]);
	const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);

	const [categoryId, setCategoryId] = useState('');
	const [title, setTitle] = useState('');
	const [price, setPrice] = useState('2500');
	const [inStock, setInStock] = useState(true);
	const [desc, setDesc] = useState('');
	const [tags, setTags] = useState('');
	const [file, setFile] = useState<File | null>(null);

	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	async function load() {
		setLoading(true);
		setErr(null);

		const c = await supabase
			.from('categories')
			.select('id, slug, name')
			.order('name');

		if (c.error) {
			setErr(c.error.message);
			setLoading(false);
			return;
		}

		const categories = c.data ?? [];
		setCats(categories);
		if (!categoryId && categories[0]?.id) setCategoryId(categories[0].id);

		const p = await supabase
			.from('products')
			.select(
				'id, title, price_uah, in_stock, image_url, image_path, description, tags, created_at, category_id',
			)
			.order('created_at', { ascending: false });

		if (p.error) {
			setErr(p.error.message);
			setLoading(false);
			return;
		}

		const products = (p.data ?? []) as Product[];
		setItems(products);

		const nextDrafts: Record<string, ProductDraft> = {};
		for (const product of products) {
			nextDrafts[product.id] = buildDraft(product);
		}
		setDrafts(nextDrafts);

		setLoading(false);
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function setDraft(id: string, patch: Partial<ProductDraft>) {
		setDrafts(prev => ({
			...prev,
			[id]: {
				...prev[id],
				...patch,
			},
		}));
	}

	async function uploadImage(
		productId: string,
		nextFile: File,
		titleForFile: string,
	) {
		const ext = nextFile.name.split('.').pop() || 'jpg';
		const safe = slugifyFileName(titleForFile || 'product');
		const path = `${productId}/${safe}.${ext}`;

		const up = await supabase.storage
			.from('product-images')
			.upload(path, nextFile, {
				upsert: true,
				contentType: nextFile.type || 'image/jpeg',
			});

		if (up.error) throw new Error(up.error.message);

		const pub = supabase.storage.from('product-images').getPublicUrl(path);
		return {
			image_path: path,
			image_url: pub.data.publicUrl || '',
		};
	}

	async function removeImageFromStorage(imagePath?: string | null) {
		if (!imagePath) return;
		const rm = await supabase.storage
			.from('product-images')
			.remove([imagePath]);
		if (rm.error) throw new Error(rm.error.message);
	}

	async function addProduct(e: React.FormEvent) {
		e.preventDefault();
		setErr(null);
		setOk(null);

		const priceUah = Number(price);

		if (!Number.isFinite(priceUah) || priceUah < 0) {
			setErr('Цена должна быть числом больше или равна нулю');
			return;
		}
		if (!categoryId) {
			setErr('Выбери категорию');
			return;
		}
		if (!title.trim()) {
			setErr('Введите название товара');
			return;
		}

		const ins = await supabase
			.from('products')
			.insert({
				category_id: categoryId,
				title: title.trim(),
				price_uah: priceUah,
				in_stock: inStock,
				description: desc.trim(),
				tags: tags
					.split(',')
					.map(x => x.trim())
					.filter(Boolean),
				image_url: '',
				image_path: null,
			})
			.select('id')
			.single();

		if (ins.error) {
			setErr(ins.error.message);
			return;
		}

		const id = ins.data.id as string;

		try {
			if (file) {
				const uploaded = await uploadImage(id, file, title.trim());

				const upd = await supabase
					.from('products')
					.update(uploaded)
					.eq('id', id);

				if (upd.error) throw new Error(upd.error.message);
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
			setErr(`Товар создан, но фото не загрузилось: ${msg}`);
		}

		setOk(`Товар добавлен: ${id}`);
		setTitle('');
		setPrice('2500');
		setInStock(true);
		setDesc('');
		setTags('');
		setFile(null);

		await load();
		router.refresh();
	}

	async function saveProduct(id: string) {
		setErr(null);
		setOk(null);
		setSavingId(id);

		try {
			const draft = drafts[id];
			const nextPrice = Number(draft.price_uah);

			if (!draft.title.trim()) {
				throw new Error('Название не может быть пустым');
			}
			if (!Number.isFinite(nextPrice) || nextPrice < 0) {
				throw new Error('Цена должна быть числом больше или равна нулю');
			}
			if (!draft.category_id) {
				throw new Error('Выбери категорию');
			}

			const upd = await supabase
				.from('products')
				.update({
					title: draft.title.trim(),
					price_uah: nextPrice,
					in_stock: draft.in_stock,
					description: draft.description.trim(),
					tags: draft.tags
						.split(',')
						.map(x => x.trim())
						.filter(Boolean),
					category_id: draft.category_id,
				})
				.eq('id', id);

			if (upd.error) throw new Error(upd.error.message);

			setItems(prev =>
				prev.map(item =>
					item.id === id
						? {
								...item,
								title: draft.title.trim(),
								price_uah: nextPrice,
								in_stock: draft.in_stock,
								description: draft.description.trim(),
								tags: draft.tags
									.split(',')
									.map(x => x.trim())
									.filter(Boolean),
								category_id: draft.category_id,
							}
						: item,
				),
			);

			setOk(`Товар сохранён: ${id}`);
		} catch (e: unknown) {
			setErr(e instanceof Error ? e.message : 'Ошибка сохранения');
		} finally {
			setSavingId(null);
		}
	}

	async function replaceImage(id: string, newFile: File) {
		setErr(null);
		setOk(null);
		setSavingId(id);

		try {
			const product = items.find(x => x.id === id);
			if (!product) throw new Error('Товар не найден');

			if (product.image_path) {
				await removeImageFromStorage(product.image_path);
			}

			const uploaded = await uploadImage(
				id,
				newFile,
				drafts[id]?.title || product.title,
			);

			const upd = await supabase.from('products').update(uploaded).eq('id', id);

			if (upd.error) throw new Error(upd.error.message);

			setItems(prev =>
				prev.map(item =>
					item.id === id
						? {
								...item,
								image_url: uploaded.image_url,
								image_path: uploaded.image_path,
							}
						: item,
				),
			);

			setOk(`Изображение обновлено: ${id}`);
		} catch (e: unknown) {
			setErr(e instanceof Error ? e.message : 'Ошибка загрузки изображения');
		} finally {
			setSavingId(null);
		}
	}

	async function removeImage(id: string) {
		setErr(null);
		setOk(null);
		setSavingId(id);

		try {
			const product = items.find(x => x.id === id);
			if (!product) throw new Error('Товар не найден');

			if (product.image_path) {
				await removeImageFromStorage(product.image_path);
			}

			const upd = await supabase
				.from('products')
				.update({
					image_url: '',
					image_path: null,
				})
				.eq('id', id);

			if (upd.error) throw new Error(upd.error.message);

			setItems(prev =>
				prev.map(item =>
					item.id === id ? { ...item, image_url: '', image_path: null } : item,
				),
			);

			setOk(`Изображение удалено: ${id}`);
		} catch (e: unknown) {
			setErr(e instanceof Error ? e.message : 'Ошибка удаления изображения');
		} finally {
			setSavingId(null);
		}
	}

	async function removeProduct(id: string) {
		setErr(null);
		setOk(null);

		const sure = confirm('Удалить товар?');
		if (!sure) return;

		try {
			const product = items.find(x => x.id === id);
			if (product?.image_path) {
				await removeImageFromStorage(product.image_path);
			}

			const r = await supabase.from('products').delete().eq('id', id);
			if (r.error) throw new Error(r.error.message);

			setItems(prev => prev.filter(x => x.id !== id));
			setOk(`Товар удалён: ${id}`);
		} catch (e: unknown) {
			setErr(e instanceof Error ? e.message : 'Ошибка удаления');
		}
	}

	async function logout() {
		await supabase.auth.signOut();
		router.replace(ADMIN_LOGIN_PATH);
		router.refresh();
	}

	return (
		<div className={s.grid}>
			<section className={`${s.card} ${s.cardPad}`}>
				<div className={s.toolbar}>
					<div>
						<h2 className={s.cardTitle}>Управление каталогом</h2>
						<p className={s.cardText}>
							Добавляй новые позиции, меняй существующие и обновляй изображения.
						</p>
					</div>

					<div className={s.toolbarActions}>
						<button className={s.btn} onClick={load} disabled={loading}>
							{loading ? 'Загрузка…' : 'Обновить'}
						</button>
						<button className={`${s.btn} ${s.btnDanger}`} onClick={logout}>
							Выйти
						</button>
					</div>
				</div>
			</section>

			<section className={s.twoCols}>
				<form
					onSubmit={addProduct}
					className={`${s.card} ${s.cardPad} ${s.grid}`}
				>
					<div>
						<h2 className={s.cardTitle}>Добавить товар</h2>
						<p className={s.cardText}>
							Заполни основные поля, прикрепи фото и товар сразу появится в
							каталоге.
						</p>
					</div>

					<div>
						<label className={s.label}>Категория</label>
						<select
							className={s.select}
							value={categoryId}
							onChange={e => setCategoryId(e.target.value)}
						>
							{cats.map(c => (
								<option key={c.id} value={c.id}>
									{c.name} ({c.slug})
								</option>
							))}
						</select>
					</div>

					<div>
						<label className={s.label}>Название</label>
						<input
							className={s.input}
							value={title}
							onChange={e => setTitle(e.target.value)}
							required
							placeholder='Напр. Euphyllia Torch Gold'
						/>
					</div>

					<div>
						<label className={s.label}>Цена (₴)</label>
						<input
							className={s.input}
							value={price}
							onChange={e => setPrice(e.target.value)}
							inputMode='numeric'
						/>
					</div>

					<label className={s.checkboxRow}>
						<input
							className={s.checkbox}
							type='checkbox'
							checked={inStock}
							onChange={e => setInStock(e.target.checked)}
						/>
						В наличии
					</label>

					<div>
						<label className={s.label}>Описание</label>
						<textarea
							className={s.textarea}
							value={desc}
							onChange={e => setDesc(e.target.value)}
							placeholder='Размер, оттенок, условия содержания...'
						/>
					</div>

					<div>
						<label className={s.label}>Теги</label>
						<input
							className={s.input}
							value={tags}
							onChange={e => setTags(e.target.value)}
							placeholder='lps, torch, premium'
						/>
					</div>

					<div>
						<label className={s.label}>Фото</label>
						<input
							className={s.input}
							type='file'
							accept='image/*'
							onChange={e => setFile(e.target.files?.[0] ?? null)}
						/>
						<p className={s.note}>
							Лучше вертикальное или квадратное фото хорошего качества.
						</p>
					</div>

					<button type='submit' className={`${s.btn} ${s.btnPrimary}`}>
						Добавить товар
					</button>

					{ok ? <div className={s.statusOk}>✅ {ok}</div> : null}
					{err ? <div className={s.statusErr}>❌ {err}</div> : null}
				</form>

				<section className={`${s.card} ${s.cardPad} ${s.grid}`}>
					<div>
						<h2 className={s.cardTitle}>Список товаров</h2>
						<p className={s.cardText}>
							Сейчас в каталоге: <strong>{items.length}</strong>
						</p>
					</div>

					<div className={s.productList}>
						{items.length ? (
							items.map(p => {
								const draft = drafts[p.id];
								if (!draft) return null;

								return (
									<article key={p.id} className={s.productCard}>
										<div className={s.productHead}>
											<div className={s.productMeta}>
												<h3 className={s.productTitle}>{p.title}</h3>
												<div className={s.productId}>{p.id}</div>
											</div>

											<div className={s.productActions}>
												<a
													href={`/p/${p.id}`}
													target='_blank'
													rel='noreferrer'
													className={s.btn}
												>
													Открыть
												</a>

												<button
													type='button'
													className={`${s.btn} ${s.btnPrimary}`}
													onClick={() => saveProduct(p.id)}
													disabled={savingId === p.id}
												>
													{savingId === p.id ? 'Сохраняю…' : 'Сохранить'}
												</button>

												<button
													type='button'
													className={`${s.btn} ${s.btnDanger}`}
													onClick={() => removeProduct(p.id)}
												>
													Удалить
												</button>
											</div>
										</div>

										<div className={s.formGrid}>
											<div>
												<label className={s.label}>Название</label>
												<input
													className={s.input}
													value={draft.title}
													onChange={e =>
														setDraft(p.id, { title: e.target.value })
													}
												/>
											</div>

											<div>
												<label className={s.label}>Цена</label>
												<input
													className={s.input}
													value={draft.price_uah}
													inputMode='numeric'
													onChange={e =>
														setDraft(p.id, { price_uah: e.target.value })
													}
												/>
											</div>

											<div>
												<label className={s.label}>Категория</label>
												<select
													className={s.select}
													value={draft.category_id}
													onChange={e =>
														setDraft(p.id, { category_id: e.target.value })
													}
												>
													{cats.map(c => (
														<option key={c.id} value={c.id}>
															{c.name} ({c.slug})
														</option>
													))}
												</select>
											</div>

											<label className={s.checkboxRow}>
												<input
													className={s.checkbox}
													type='checkbox'
													checked={draft.in_stock}
													onChange={e =>
														setDraft(p.id, { in_stock: e.target.checked })
													}
												/>
												В наличии
											</label>
										</div>

										<div>
											<label className={s.label}>Описание</label>
											<textarea
												className={s.textarea}
												value={draft.description}
												onChange={e =>
													setDraft(p.id, { description: e.target.value })
												}
											/>
										</div>

										<div>
											<label className={s.label}>Теги</label>
											<input
												className={s.input}
												value={draft.tags}
												onChange={e => setDraft(p.id, { tags: e.target.value })}
											/>
										</div>

										<div className={s.imageBlock}>
											<div className={s.preview}>
												{p.image_url ? (
													<img src={p.image_url} alt={p.title} />
												) : (
													<div className={s.previewEmpty}>Нет изображения</div>
												)}
											</div>

											<div className={s.grid}>
												<div>
													<label className={s.label}>Заменить фото</label>
													<input
														className={s.input}
														type='file'
														accept='image/*'
														onChange={async e => {
															const nextFile = e.target.files?.[0];
															if (!nextFile) return;
															await replaceImage(p.id, nextFile);
															e.currentTarget.value = '';
														}}
													/>
												</div>

												<div className={s.productActions}>
													<button
														type='button'
														className={s.btn}
														onClick={() => removeImage(p.id)}
														disabled={!p.image_url || savingId === p.id}
													>
														Удалить изображение
													</button>
												</div>

												<div className={s.note}>
													image_path: {p.image_path || '—'}
												</div>
											</div>
										</div>
									</article>
								);
							})
						) : (
							<div className={s.empty}>Пока нет товаров.</div>
						)}
					</div>

					{ok ? <div className={s.statusOk}>✅ {ok}</div> : null}
					{err ? <div className={s.statusErr}>❌ {err}</div> : null}
				</section>
			</section>
		</div>
	);
}
