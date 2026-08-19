const IsOnScreen = (() => {
	'use strict';

	// --- Scroll direction: lives on <body>, decoupled from any tracked element ---
	let lastScrollY = window.scrollY;
	let scrollDirection = 'down';

	const updateScrollDirection = () => {
			const currentY = window.scrollY;
			scrollDirection = currentY >= lastScrollY ? 'down' : 'up';
			lastScrollY = currentY;
			document.body.setAttribute('data-scroll-direction', scrollDirection);
	};

	// --- Shared positional logic, direction-aware ---
	// top/bottom are relative to the viewport, vh is viewport height.
	// "pending" = haven't reached it yet, "exited" = already gone by —
	// which physical zone counts as which flips with direction, since
	// reversing direction reverses which end of the element you meet first.
	const computeState = (top, bottom, vh, direction) => {
			const down = direction === 'down';

			if (top >= vh) {
					return down ? 'pending' : 'exited';
			}
			if (bottom <= 0) {
					return down ? 'exited' : 'pending';
			}
			if (top <= 0 && bottom >= vh) {
					// Taller than the viewport — spans it entirely either way
					return 'entered';
			}
			if (top <= 0 && bottom > 0) {
					return down ? 'exiting' : 'entering';
			}
			if (top >= 0 && bottom <= vh) {
					return 'entered';
			}
			if (top >= 0 && bottom > vh) {
					return down ? 'entering' : 'exiting';
			}
			return undefined;
	};

	// Track last-known state per element so we know which ones are
	// "parked" at ratio 0 and need manual recomputation on scroll
	const elementStates = new Map();

	const applyState = (el, state) => {
			if (!state || elementStates.get(el) === state) return;
			elementStates.set(el, state);
			el.setAttribute('data-screen', state);
	};

	const updateFromEntry = (entry) => {
			const el = entry.target;
			const { top, bottom } = entry.boundingClientRect;
			applyState(el, computeState(top, bottom, window.innerHeight, scrollDirection));
	};

	// IntersectionObserver won't fire while ratio stays at 0 (fully off-screen),
	// which is exactly when pending/exited can flip due to a direction change.
	// So on scroll, manually recheck any element currently parked at ratio 0.
	const recheckParkedElements = () => {
			const vh = window.innerHeight;
			elementStates.forEach((state, el) => {
					if (state !== 'pending' && state !== 'exited') return;
					const { top, bottom } = el.getBoundingClientRect();
					applyState(el, computeState(top, bottom, vh, scrollDirection));
			});
	};

	let ticking = false;
	const onScroll = () => {
			updateScrollDirection();
			if (!ticking) {
					ticking = true;
					requestAnimationFrame(() => {
							recheckParkedElements();
							ticking = false;
					});
			}
	};

	window.addEventListener('scroll', onScroll, { passive: true });

	const init = () => {
			const elements = document.querySelectorAll('.isOnScreen');
			if (!elements.length) return;

			document.body.setAttribute('data-scroll-direction', scrollDirection);

			const observer = new IntersectionObserver(
					(entries) => entries.forEach(updateFromEntry),
					{
							// Fire at every pixel boundary we care about
							threshold: buildThresholds(),
							// rootMargin: '0px' — default, viewport edges
					}
			);

			elements.forEach((el) => observer.observe(el));
	};

	// Dense threshold array so IntersectionObserver fires frequently enough
	// for large elements where ratio alone doesn't tell you which edge crossed
	const buildThresholds = () => {
			const steps = 20;
			return Array.from({ length: steps + 1 }, (_, i) => i / steps);
	};

	return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
	IsOnScreen.init();
});