'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
		file: File,
		titleForFile: string,
	) {
		const ext = file.name.split('.').pop() || 'jpg';
		const safe = slugifyFileName(titleForFile || 'product');
		const path = `${productId}/${safe}.${ext}`;

		const up = await supabase.storage
			.from('product-images')
			.upload(path, file, {
				upsert: true,
				contentType: file.type || 'image/jpeg',
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
			setErr('Цена должна быть числом >= 0');
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
				throw new Error('Цена должна быть числом >= 0');
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
		router.replace('/admin/login');
		router.refresh();
	}

	return (
		<div style={{ display: 'grid', gap: 16 }}>
			<div
				style={{
					display: 'flex',
					gap: 10,
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<button onClick={load} disabled={loading}>
					Обновить
				</button>
				<button onClick={logout}>Выйти</button>
				{loading ? <span style={{ opacity: 0.7 }}>Загрузка…</span> : null}
			</div>

			<form
				onSubmit={addProduct}
				style={{
					border: '1px solid #d9e7ef',
					borderRadius: 18,
					padding: 16,
					display: 'grid',
					gap: 10,
					maxWidth: 840,
					background: '#fff',
				}}
			>
				<h2 style={{ margin: 0 }}>Добавить товар</h2>

				<div style={{ display: 'grid', gap: 6 }}>
					<label>Категория</label>
					<select
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

				<div style={{ display: 'grid', gap: 6 }}>
					<label>Название</label>
					<input
						value={title}
						onChange={e => setTitle(e.target.value)}
						required
						placeholder='Напр. Euphyllia Torch Gold'
					/>
				</div>

				<div style={{ display: 'grid', gap: 6 }}>
					<label>Цена (₴)</label>
					<input
						value={price}
						onChange={e => setPrice(e.target.value)}
						inputMode='numeric'
					/>
				</div>

				<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<input
						type='checkbox'
						checked={inStock}
						onChange={e => setInStock(e.target.checked)}
					/>
					В наличии
				</label>

				<div style={{ display: 'grid', gap: 6 }}>
					<label>Описание</label>
					<textarea
						value={desc}
						onChange={e => setDesc(e.target.value)}
						placeholder='Размер, оттенок, условия содержания...'
						rows={4}
					/>
				</div>

				<div style={{ display: 'grid', gap: 6 }}>
					<label>Теги</label>
					<input
						value={tags}
						onChange={e => setTags(e.target.value)}
						placeholder='lps, torch, premium'
					/>
				</div>

				<div style={{ display: 'grid', gap: 6 }}>
					<label>Фото</label>
					<input
						type='file'
						accept='image/*'
						onChange={e => setFile(e.target.files?.[0] ?? null)}
					/>
				</div>

				<button type='submit'>Добавить товар</button>

				{ok ? <div style={{ color: 'green' }}>✅ {ok}</div> : null}
				{err ? <div style={{ color: 'crimson' }}>❌ {err}</div> : null}
			</form>

			<div
				style={{
					border: '1px solid #d9e7ef',
					borderRadius: 18,
					padding: 16,
					background: '#fff',
				}}
			>
				<h2 style={{ marginTop: 0 }}>Список товаров ({items.length})</h2>

				<div style={{ display: 'grid', gap: 14 }}>
					{items.map(p => {
						const draft = drafts[p.id];
						if (!draft) return null;

						return (
							<div
								key={p.id}
								style={{
									border: '1px solid #e7eef3',
									borderRadius: 16,
									padding: 14,
									display: 'grid',
									gap: 12,
								}}
							>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 12,
										alignItems: 'center',
										flexWrap: 'wrap',
									}}
								>
									<div>
										<div style={{ fontWeight: 700 }}>{p.title}</div>
										<div style={{ fontSize: 12, opacity: 0.7 }}>{p.id}</div>
									</div>

									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
										<a href={`/p/${p.id}`} target='_blank' rel='noreferrer'>
											Открыть товар
										</a>

										<button
											type='button'
											onClick={() => saveProduct(p.id)}
											disabled={savingId === p.id}
										>
											{savingId === p.id ? 'Сохраняю…' : 'Сохранить'}
										</button>

										<button
											type='button'
											onClick={() => removeProduct(p.id)}
											style={{ color: 'crimson' }}
										>
											Удалить
										</button>
									</div>
								</div>

								<div
									style={{
										display: 'grid',
										gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
										gap: 12,
									}}
								>
									<div style={{ display: 'grid', gap: 6 }}>
										<label>Название</label>
										<input
											value={draft.title}
											onChange={e => setDraft(p.id, { title: e.target.value })}
										/>
									</div>

									<div style={{ display: 'grid', gap: 6 }}>
										<label>Цена</label>
										<input
											value={draft.price_uah}
											inputMode='numeric'
											onChange={e =>
												setDraft(p.id, { price_uah: e.target.value })
											}
										/>
									</div>

									<div style={{ display: 'grid', gap: 6 }}>
										<label>Категория</label>
										<select
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

									<label
										style={{ display: 'flex', gap: 8, alignItems: 'center' }}
									>
										<input
											type='checkbox'
											checked={draft.in_stock}
											onChange={e =>
												setDraft(p.id, { in_stock: e.target.checked })
											}
										/>
										В наличии
									</label>
								</div>

								<div style={{ display: 'grid', gap: 6 }}>
									<label>Описание</label>
									<textarea
										rows={4}
										value={draft.description}
										onChange={e =>
											setDraft(p.id, { description: e.target.value })
										}
									/>
								</div>

								<div style={{ display: 'grid', gap: 6 }}>
									<label>Теги</label>
									<input
										value={draft.tags}
										onChange={e => setDraft(p.id, { tags: e.target.value })}
									/>
								</div>

								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '180px 1fr',
										gap: 12,
										alignItems: 'start',
									}}
								>
									<div>
										<div
											style={{
												width: 180,
												height: 180,
												borderRadius: 14,
												overflow: 'hidden',
												background: '#f2f8fb',
												border: '1px solid #dbe8ef',
											}}
										>
											{p.image_url ? (
												<img
													src={p.image_url}
													alt={p.title}
													style={{
														width: '100%',
														height: '100%',
														objectFit: 'cover',
														display: 'block',
													}}
												/>
											) : null}
										</div>
									</div>

									<div style={{ display: 'grid', gap: 10 }}>
										<input
											type='file'
											accept='image/*'
											onChange={async e => {
												const nextFile = e.target.files?.[0];
												if (!nextFile) return;
												await replaceImage(p.id, nextFile);
												e.currentTarget.value = '';
											}}
										/>

										<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
											<button
												type='button'
												onClick={() => removeImage(p.id)}
												disabled={!p.image_url || savingId === p.id}
											>
												Удалить изображение
											</button>
										</div>

										<div style={{ fontSize: 12, opacity: 0.7 }}>
											image_path: {p.image_path || '—'}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{!items.length && !loading ? (
					<div style={{ opacity: 0.7 }}>Пока нет товаров.</div>
				) : null}
			</div>
		</div>
	);
}
