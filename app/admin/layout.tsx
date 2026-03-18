export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang='ru'>
			<body style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
				{children}
			</body>
		</html>
	);
}
