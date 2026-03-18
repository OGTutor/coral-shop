import styles from './brandLogo.module.css';

export default function BrandLogo() {
	return (
		<span className={styles.logo} aria-hidden='true'>
			<img src='/brand/Logo.svg' alt='' width={44} height={44} />
		</span>
	);
}
