import SiteFooter from './SiteFooter/SiteFooter';
import SiteHeader from './SiteHeader/SiteHeader';
import styles from './storeShell.module.css';

export default function StoreShell({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className={styles.shell}>
			<SiteHeader />
			<div className={styles.main}>{children}</div>
			<SiteFooter />
		</div>
	);
}
