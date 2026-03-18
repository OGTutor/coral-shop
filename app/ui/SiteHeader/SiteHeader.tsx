import { supabaseServer } from '@/lib/supabase/server';
import SiteHeaderClient from './SiteHeaderClient';

export default async function SiteHeader() {
	const sb = supabaseServer();
	const { data: cats } = await sb
		.from('categories')
		.select('slug,name')
		.order('name');

	return <SiteHeaderClient cats={cats ?? []} />;
}
