import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCertifications, getCertificationsErrorMessage, type Certification } from '../api/certifications';

const levelRank: Record<Certification['level'], number> = {
	ENTRY: 1,
	PROFESSIONAL: 2,
	MASTERY: 3,
};

const fallbackJourneyBadgeBySlug: Record<string, string> = {
	'certified-practitioner': '🟦',
	'certified-asha-mental-wellness-champion': '🟩',
	'certified-nlp-therapist': '🟨',
	'certified-psychologist': '🟧',
	'certified-psychiatrist': '🟥',
	'certified-executive-therapist': '🟪',
};

const getJourneyBadge = (item: Certification): string => {
	const fromMetadata = item.metadata?.journeyBadge;
	if (typeof fromMetadata === 'string' && fromMetadata.trim().length > 0) {
		return fromMetadata;
	}

	return fallbackJourneyBadgeBySlug[item.slug] || '🟦';
};

const getDetailFields = (item: Certification): Array<{ label: string; value: string }> => {
	const rawFields = item.metadata?.detailFields;
	if (Array.isArray(rawFields)) {
		const normalized = rawFields
			.filter((field): field is { label: string; value: string } => {
				return (
					typeof field === 'object' &&
					field !== null &&
					typeof field.label === 'string' &&
					field.label.trim().length > 0 &&
					typeof field.value === 'string' &&
					field.value.trim().length > 0
				);
			})
			.map((field) => ({
				label: field.label,
				value: field.value,
			}));

		if (normalized.length > 0) {
			return normalized;
		}
	}

	const fallbackFields: Array<{ label: string; value: string }> = [{ label: 'Duration', value: item.durationLabel }];

	if (item.monthlyIncomeLabel) fallbackFields.push({ label: 'Monthly Income', value: item.monthlyIncomeLabel });
	if (item.investmentLabel) fallbackFields.push({ label: 'Investment', value: item.investmentLabel });
	if (typeof item.modulesCount === 'number') fallbackFields.push({ label: 'Modules', value: String(item.modulesCount) });
	if (item.deliveryMode) fallbackFields.push({ label: 'Delivery', value: item.deliveryMode });
	if (item.sessionRateLabel) fallbackFields.push({ label: 'Session Rate', value: item.sessionRateLabel });
	if (item.outcomeLabel) fallbackFields.push({ label: 'Outcome', value: item.outcomeLabel });

	return fallbackFields;
};

export default function CertificationsPage() {
	const navigate = useNavigate();
	const [items, setItems] = useState<Certification[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
	const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);

	const loadCertifications = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await getCertifications();
			setItems(data.items ?? []);
		} catch (err) {
			setError(getCertificationsErrorMessage(err, 'Unable to load certifications'));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let mounted = true;
		const guardedLoad = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await getCertifications();
				if (mounted) {
					setItems(data.items ?? []);
				}
			} catch (err) {
				if (mounted) {
					setError(getCertificationsErrorMessage(err, 'Unable to load certifications'));
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		void guardedLoad();
		return () => {
			mounted = false;
		};
	}, []);

	const handlePrimaryCta = (item: Certification) => {
		if (!item.enrollmentOpen || item.isInvitationOnly) return;
		navigate(`/auth/signup?program=${encodeURIComponent(item.slug)}`);
	};

	const handleSecondaryCta = (item: Certification) => {
		navigate(`/assessment?track=${encodeURIComponent(item.slug)}`);
	};

	const sortedItems = useMemo(() => {
		return [...items].sort((a, b) => {
			if (levelRank[a.level] !== levelRank[b.level]) {
				return levelRank[a.level] - levelRank[b.level];
			}
			return a.sortOrder - b.sortOrder;
		});
	}, [items]);

	const entryLevel = useMemo(() => sortedItems.filter((item) => item.level === 'ENTRY'), [sortedItems]);
	const professionalLevel = useMemo(() => sortedItems.filter((item) => item.level === 'PROFESSIONAL'), [sortedItems]);
	const masteryLevel = useMemo(() => sortedItems.filter((item) => item.level === 'MASTERY'), [sortedItems]);
	const featuredEnrollment = useMemo(
		() => sortedItems.find((item) => item.enrollmentOpen && !item.isInvitationOnly) ?? sortedItems[0],
		[sortedItems]
	);
	const activeCardKey = hoveredCardKey ?? selectedCardKey;

	const getCardSurfaceClasses = (level: Certification['level'], isActive: boolean) => {
		if (!isActive) return 'border-calm-sage/20 bg-cream ring-0';

		if (level === 'ENTRY') return 'border-gentle-blue/70 bg-gentle-blue/15 ring-2 ring-gentle-blue/45 shadow-soft-sm';
		if (level === 'PROFESSIONAL') return 'border-yellow-400/70 bg-yellow-100 ring-2 ring-yellow-300/70 shadow-soft-md';
		return 'border-soft-lavender/70 bg-soft-lavender/18 ring-2 ring-soft-lavender/45 shadow-soft-sm';
	};

	return (
		<div className="responsive-page">
			<header className="fixed inset-x-0 top-0 z-50" role="banner">
				<div className="w-full border-b border-calm-sage/15 bg-charcoal/90 px-4 py-2 backdrop-blur-sm md:px-6 lg:px-10">
					<div className="mx-auto max-w-7xl">
						<div className="flex items-center justify-between">
						<Link
							to="/"
							className="group inline-flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-light tracking-wide text-cream transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 focus:ring-offset-2 focus:ring-offset-charcoal md:text-xl lg:text-2xl"
							aria-label="MANAS360 home"
						>
							<img src="/Untitled.png" alt="MANAS360 logo" className="h-6 w-6 rounded-md object-cover" />
							<span className="font-serif">
								MANAS<span className="font-semibold">360</span>
							</span>
						</Link>
						<div className="flex items-center gap-2 sm:gap-2.5">
							<button
								type="button"
								onClick={() => {
									document.getElementById('comparison-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
								}}
								className="hidden rounded-full px-3 py-1.5 text-xs font-medium tracking-wide text-cream/75 transition-all duration-300 hover:text-cream sm:inline-flex"
							>
								Subscribe
							</button>
							<Link
								to="/auth/login"
								className="inline-flex min-h-[34px] items-center justify-center rounded-full bg-cream px-3.5 py-1.5 text-xs font-semibold tracking-wide text-charcoal transition-all duration-300 hover:bg-white md:min-h-[36px] md:px-4"
							>
								Login / Signup
							</Link>
						</div>
						</div>

						<div className="mt-1.5 flex items-center justify-between gap-2 border-t border-calm-sage/20 pt-1.5 sm:gap-3">
							<div className="min-w-0 text-xs text-cream/80 sm:flex sm:items-center sm:gap-2 sm:text-sm">
								<p className="truncate font-semibold text-cream">Plan your certification pathway</p>
								<p className="hidden text-[11px] text-cream/70 sm:block sm:truncate sm:text-sm">Compare options and complete enrollment in a few steps.</p>
							</div>
							<div className="flex shrink-0 items-center gap-1.5">
								<button
									type="button"
									onClick={() => {
										document.getElementById('comparison-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
									}}
									className="rounded-full border border-calm-sage/40 bg-transparent px-2.5 py-1 text-[10px] font-semibold text-cream hover:bg-cream/10"
								>
									Compare Programs
								</button>
								<button
									type="button"
									onClick={() => {
										if (!featuredEnrollment) return;
										handlePrimaryCta(featuredEnrollment);
									}}
									disabled={!featuredEnrollment}
									className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold text-charcoal disabled:cursor-not-allowed disabled:opacity-60"
								>
									Start Enrollment
								</button>
							</div>
						</div>
					</div>
				</div>
			</header>

			<div className="responsive-container pt-44 pb-6 sm:pt-40 sm:pb-10">
				<div className="mx-auto max-w-6xl space-y-10">
					<section className="rounded-3xl border border-calm-sage/20 bg-white p-6 shadow-soft-sm sm:p-8">
						<h1 className="font-serif text-3xl font-light text-charcoal sm:text-4xl">Your Certification Journey</h1>
						<p className="mt-3 text-sm text-charcoal/70 sm:text-base">
							Choose your entry point based on your background, goals, and time commitment.
						</p>

						<div className="mt-6 space-y-6">
							<div
								role="button"
								tabIndex={0}
								onMouseEnter={() => setHoveredCardKey('journey-entry')}
								onMouseLeave={() => setHoveredCardKey(null)}
								onClick={() => setSelectedCardKey((prev) => (prev === 'journey-entry' ? null : 'journey-entry'))}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										setSelectedCardKey((prev) => (prev === 'journey-entry' ? null : 'journey-entry'));
									}
								}}
								className={`rounded-3xl border p-4 transition-all duration-500 ease-out ${getCardSurfaceClasses('ENTRY', activeCardKey === 'journey-entry')}`}
							>
								<p className="font-medium text-charcoal">Entry Level: Self-Directed Learning</p>
								<p className="mt-1 text-sm text-charcoal/70">Begin with foundational mental wellness and psychoeducation skills.</p>
								<div className="mt-2 flex flex-wrap gap-2 text-sm font-medium text-charcoal">
									{entryLevel.map((item) => (
										<span key={item.id} className="rounded-full bg-white px-3 py-1">
											{item.levelBadge || getJourneyBadge(item)} {item.shortTitle || item.title}
										</span>
									))}
								</div>
							</div>

							<div
								role="button"
								tabIndex={0}
								onMouseEnter={() => setHoveredCardKey('journey-professional')}
								onMouseLeave={() => setHoveredCardKey(null)}
								onClick={() => setSelectedCardKey((prev) => (prev === 'journey-professional' ? null : 'journey-professional'))}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										setSelectedCardKey((prev) => (prev === 'journey-professional' ? null : 'journey-professional'));
									}
								}}
								className={`rounded-3xl border p-4 transition-all duration-500 ease-out ${getCardSurfaceClasses('PROFESSIONAL', activeCardKey === 'journey-professional')}`}
							>
								<p className="font-medium text-charcoal">Professional Level: Clinical & Coaching Excellence</p>
								<p className="mt-1 text-sm text-charcoal/70">Build advanced clinical and coaching capabilities with recognized credentials.</p>
								<div className="mt-2 flex flex-wrap gap-2 text-sm font-medium text-charcoal">
									{professionalLevel.map((item) => (
										<span key={item.id} className="rounded-full bg-white px-3 py-1">
											{item.levelBadge || getJourneyBadge(item)} {item.shortTitle || item.title}
										</span>
									))}
								</div>
							</div>

							<div
								role="button"
								tabIndex={0}
								onMouseEnter={() => setHoveredCardKey('journey-mastery')}
								onMouseLeave={() => setHoveredCardKey(null)}
								onClick={() => setSelectedCardKey((prev) => (prev === 'journey-mastery' ? null : 'journey-mastery'))}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										setSelectedCardKey((prev) => (prev === 'journey-mastery' ? null : 'journey-mastery'));
									}
								}}
								className={`rounded-3xl border p-4 transition-all duration-500 ease-out ${getCardSurfaceClasses('MASTERY', activeCardKey === 'journey-mastery')}`}
							>
								<p className="font-medium text-charcoal">Mastery Level: Consciousness Work</p>
								<p className="mt-1 text-sm text-charcoal/70">Integrate advanced therapeutic frameworks for high-impact transformation work.</p>
								<div className="mt-2 flex flex-wrap gap-2 text-sm font-medium text-charcoal">
									{masteryLevel.map((item) => (
										<span key={item.id} className="rounded-full bg-white px-3 py-1">
											{item.levelBadge || getJourneyBadge(item)} {item.shortTitle || item.title}
										</span>
									))}
									<span className="rounded-full bg-white px-3 py-1">Master Faculty (Invitation Only)</span>
								</div>
							</div>
						</div>
					</section>

					<section className="rounded-3xl border border-calm-sage/20 bg-white p-6 shadow-soft-sm sm:p-8">
						<h2 className="text-2xl font-semibold text-charcoal">Professional Benefits</h2>
						<p className="mt-2 text-sm text-charcoal/70">Certified professionals receive operational and visibility advantages.</p>
						<div className="mt-5 grid gap-3 sm:grid-cols-2">
							<div className="rounded-xl border border-calm-sage/20 bg-cream p-4">
								<p className="font-medium text-charcoal">24-Hour Lead Priority</p>
								<p className="mt-1 text-sm text-charcoal/70">Early access to new patient referrals.</p>
							</div>
							<div className="rounded-xl border border-calm-sage/20 bg-cream p-4">
								<p className="font-medium text-charcoal">Boosted Profile Visibility</p>
								<p className="mt-1 text-sm text-charcoal/70">Higher ranking in provider discovery results.</p>
							</div>
							<div className="rounded-xl border border-calm-sage/20 bg-cream p-4">
								<p className="font-medium text-charcoal">Flexible Payment Plans</p>
								<p className="mt-1 text-sm text-charcoal/70">Three-installment options to reduce upfront cost.</p>
							</div>
							<div className="rounded-xl border border-calm-sage/20 bg-cream p-4">
								<p className="font-medium text-charcoal">Lifetime Access</p>
								<p className="mt-1 text-sm text-charcoal/70">Ongoing access to materials, updates, and advanced modules.</p>
							</div>
						</div>
					</section>

					<section className="rounded-3xl border border-calm-sage/20 bg-white p-6 shadow-soft-sm sm:p-8">
						<h2 className="text-2xl font-semibold text-charcoal">Certification Details</h2>

						{loading && (
							<div className="mt-6 grid gap-4 md:grid-cols-2" aria-live="polite" aria-busy="true">
								{Array.from({ length: 4 }).map((_, index) => (
									<div key={`cert-skeleton-${index}`} className="rounded-2xl border border-calm-sage/20 bg-cream p-4">
										<div className="h-6 w-3/4 animate-pulse rounded bg-calm-sage/20" />
										<div className="mt-3 h-4 w-full animate-pulse rounded bg-calm-sage/20" />
										<div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-calm-sage/20" />
										<div className="mt-4 flex gap-2">
											<div className="h-8 w-28 animate-pulse rounded-full bg-calm-sage/20" />
											<div className="h-8 w-28 animate-pulse rounded-full bg-calm-sage/20" />
										</div>
									</div>
								))}
							</div>
						)}
						{error && (
							<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
								<p className="text-sm text-red-700" role="alert">{error}</p>
								<button
									type="button"
									onClick={() => {
										void loadCertifications();
									}}
									className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
								>
									Retry
								</button>
							</div>
						)}

						{!loading && !error && (
							<div className="mt-6 grid gap-4 md:grid-cols-2">
								{sortedItems.map((item) => (
									<article
										key={item.id}
										onMouseEnter={() => setHoveredCardKey(item.id)}
										onMouseLeave={() => setHoveredCardKey(null)}
										onClick={() => setSelectedCardKey((prev) => (prev === item.id ? null : item.id))}
										className={`cursor-pointer rounded-3xl border p-4 transition-all duration-500 ease-out ${getCardSurfaceClasses(item.level, activeCardKey === item.id)}`}
									>
										<h3 className="text-lg font-semibold text-charcoal">{item.metadata?.detailTitle || item.title}</h3>
										<p className="mt-1 text-sm text-charcoal/70">{item.journeyDescription || item.subtitle}</p>
										{item.outcomeLabel && (
											<p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-charcoal">Outcome: {item.outcomeLabel}</p>
										)}
										<div className="mt-3 grid gap-2 sm:grid-cols-2">
											<div className="rounded-lg bg-white px-3 py-2 text-xs text-charcoal/80">
												<p className="font-semibold text-charcoal">Duration</p>
												<p>{item.durationLabel}</p>
											</div>
											<div className="rounded-lg bg-white px-3 py-2 text-xs text-charcoal/80">
												<p className="font-semibold text-charcoal">Investment</p>
												<p>{item.investmentLabel}</p>
											</div>
										</div>
										<div className="mt-3 space-y-1 text-sm text-charcoal/80">
											{getDetailFields(item).map((field) => (
												<p key={`${item.id}-${field.label}`}>{field.label}: {field.value}</p>
											))}
										</div>
										<div className="mt-3 flex flex-wrap gap-2 text-xs text-charcoal/70">
											<span className="rounded-full bg-white px-2.5 py-1">{item.levelBadge || item.level}</span>
											{item.isInvitationOnly && <span className="rounded-full bg-white px-2.5 py-1">Invitation Only</span>}
											{!item.enrollmentOpen && <span className="rounded-full bg-white px-2.5 py-1">Enrollment Closed</span>}
										</div>
										<div className="mt-4 flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => handlePrimaryCta(item)}
												disabled={!item.enrollmentOpen || item.isInvitationOnly}
												className="rounded-full bg-gradient-calm px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
											>
												{item.isInvitationOnly ? 'Invite Only' : item.primaryCtaLabel}
											</button>
											<button
												type="button"
												onClick={() => handleSecondaryCta(item)}
												className="rounded-full border border-calm-sage/30 bg-white px-4 py-2 text-xs font-semibold text-charcoal hover:bg-calm-sage/10"
											>
												{item.secondaryCtaLabel}
											</button>
										</div>
									</article>
								))}
							</div>
						)}
					</section>

					<section id="comparison-table" className="rounded-3xl border border-calm-sage/20 bg-white p-6 shadow-soft-sm sm:p-8">
						<h2 className="text-2xl font-semibold text-charcoal">Program Comparison</h2>
						<div className="mt-5 space-y-3 sm:hidden">
							{sortedItems.map((item) => (
								<article key={`mobile-${item.id}`} className="rounded-xl border border-calm-sage/20 bg-cream p-4 text-sm text-charcoal/80">
									<p className="font-semibold text-charcoal">{item.shortTitle || item.title}</p>
									<div className="mt-2 space-y-1">
										<p>Duration: {item.metadata?.comparisonDuration || item.durationLabel}</p>
										<p>Investment: {item.investmentLabel}</p>
										<p>Monthly Income: {item.monthlyIncomeLabel || 'Not specified'}</p>
										<p>Prerequisites: {item.prerequisitesLabel}</p>
									</div>
								</article>
							))}
						</div>
						<div className="mt-5 hidden overflow-x-auto sm:block">
							<table className="min-w-full border-collapse text-left text-sm">
								<caption className="sr-only">Comparison of certification duration, investment, expected income, and prerequisites</caption>
								<thead>
									<tr className="border-b border-calm-sage/20 text-charcoal">
										<th scope="col" className="px-3 py-2 font-semibold">Certification</th>
										<th scope="col" className="px-3 py-2 font-semibold">Duration</th>
										<th scope="col" className="px-3 py-2 font-semibold">Investment</th>
										<th scope="col" className="px-3 py-2 font-semibold">Monthly Income</th>
										<th scope="col" className="px-3 py-2 font-semibold">Prerequisites</th>
									</tr>
								</thead>
								<tbody>
									{sortedItems.map((item) => (
										<tr key={`row-${item.id}`} className="border-b border-calm-sage/10 text-charcoal/80">
											<td className="px-3 py-2">{item.shortTitle || item.title}</td>
											<td className="px-3 py-2">{item.metadata?.comparisonDuration || item.durationLabel}</td>
											<td className="px-3 py-2">{item.investmentLabel}</td>
											<td className="px-3 py-2">{item.monthlyIncomeLabel || 'Not specified'}</td>
											<td className="px-3 py-2">{item.prerequisitesLabel}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
