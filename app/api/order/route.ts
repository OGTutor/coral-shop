import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const OrderSchema = z.object({
	items: z
		.array(
			z.object({
				productId: z.string(),
				title: z.string(),
				price: z.number(),
				qty: z.number().int().min(1),
			}),
		)
		.min(1),
	customerName: z.string().min(2),
	phone: z.string().min(6),
	city: z.string().min(2),
	shipping: z.string().min(2),
	comment: z.string().optional().default(''),
});

async function sendTelegram(text: string) {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	if (!token || !chatId) {
		return { skipped: true, reason: 'TELEGRAM env missing' as const };
	}

	const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text }),
	});

	const data = await r.json().catch(() => null);
	if (!r.ok) throw new Error(`Telegram error: ${JSON.stringify(data)}`);

	return { skipped: false, ok: true as const };
}

export async function POST(req: Request) {
	try {
		const json = await req.json();
		const parsed = OrderSchema.safeParse(json);

		if (!parsed.success) {
			return NextResponse.json(
				{ ok: false, where: 'validation', error: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const sb = supabaseServer();
		const d = parsed.data;

		const ins = await sb
			.from('orders')
			.insert({
				items: d.items,
				customer_name: d.customerName,
				phone: d.phone,
				city: d.city,
				shipping: d.shipping,
				comment: d.comment,
			})
			.select('id')
			.single();

		if (ins.error) {
			return NextResponse.json(
				{ ok: false, where: 'supabase_insert', error: ins.error },
				{ status: 500 },
			);
		}

		const total = d.items.reduce((s, x) => s + x.price * x.qty, 0);

		const tg = await sendTelegram(
			`🪸 Новый заказ #${ins.data.id}\n` +
				`Имя: ${d.customerName}\nТел: ${d.phone}\nГород: ${d.city}\nДоставка: ${d.shipping}\n` +
				`Товары:\n${d.items.map(i => `- ${i.title} x${i.qty} = ${i.price * i.qty}₴`).join('\n')}\n` +
				`Итого: ${total}₴\nКомментарий: ${d.comment || '—'}`,
		);

		return NextResponse.json({ ok: true, id: ins.data.id, telegram: tg });
	} catch (e: unknown) {
		const message =
			e instanceof Error
				? e.message
				: typeof e === 'string'
					? e
					: 'Unknown error';

		return NextResponse.json(
			{ ok: false, where: 'route_crash', error: message },
			{ status: 500 },
		);
	}
}
