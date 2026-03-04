import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
	{ to: '/admin/analytics', label: 'Analytics' },
	{ to: '/admin/users', label: 'Users' },
	{ to: '/admin/therapists', label: 'Therapists' },
	{ to: '/admin/verification', label: 'Verification' },
	{ to: '/admin/subscriptions', label: 'Subscriptions' },
	{ to: '/admin/revenue', label: 'Revenue' },
	{ to: '/admin/clinical-assistant', label: 'Clinical Assistant' },
	{ to: '/admin/settings', label: 'Settings' },
];

export default function AdminShellLayout() {
	return (
		<div className="responsive-page">
			<div className="w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid gap-4 lg:grid-cols-[240px_1fr]">
					<aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:h-fit">
						<div className="mb-3 flex items-center gap-2">
							<img
								src="/Untitled.png"
								alt="MANAS360 logo"
								className="h-6 w-6 rounded-md object-cover"
							/>
							<p className="text-sm font-semibold text-slate-900">MANAS360</p>
						</div>
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin Panel</p>
						<nav className="space-y-1">
							{navItems.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									className={({ isActive }) =>
										[
											'block rounded-lg px-3 py-2 text-sm font-medium transition',
											isActive
												? 'bg-slate-900 text-white'
												: 'text-slate-700 hover:bg-slate-100',
										].join(' ')
									}
								>
									{item.label}
								</NavLink>
							))}
						</nav>
					</aside>
					<main className="min-w-0">
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	);
}
