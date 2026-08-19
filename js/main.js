/** 
 * Helpers
 */

const getAdminBarHeight = () =>
    document.querySelector('#wpadminbar')?.offsetHeight ?? 0;

const getNavBarHeight = (el) =>
    document.querySelector(el)?.offsetHeight ?? 0;

const randomNumberBetween = (min, max) => {
    return Math.random() * (max - min) + min;
}

const shuffleArray = ( array ) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


/** 
* Defaults 
*/

const DEFAULT_STYLES = [
	{ prop: 'maxWidth',   min: 20,   max: 450, units: 'px'  },
	{ prop: 'top',        min: -100, max: 100,  units: '%'   },
	{ prop: 'left',       min: -100, max: 100, units: '%'   },
	{ prop: 'transform',  min: -360, max: 360, units: 'deg', transformFn: 'rotate' },
];

// weight controls the proportion of elements in each group
const DEFAULT_GROUPS = [
	{ divisor: 1.125, weight: 1 },  // fast
	{ divisor: 2,     weight: 1 },  // medium
	{ divisor: 4,     weight: 1 },  // slow
];


/** Internal helper */

const applyRandomStyle = (el, { prop, min, max, units, transformFn }) => {
    const val = randomNumberBetween(min, max);
    el.style[prop] = transformFn
    ? `${transformFn}(${val}${units})`
    : `${val}${units}`;
};


/**
* Shuffles element indices and assigns each a scroll divisor based on
* weighted group proportions.
*
* Example — 50/25/25 split across 3 groups:
*   groups = [
*     { divisor: 1.125, weight: 2 },
*     { divisor: 2,     weight: 1 },
*     { divisor: 4,     weight: 1 },
*   ]
*/
const assignGroups = (count, groups) => {
	const totalWeight = groups.reduce((sum, { weight }) => sum + weight, 0);
	const shuffled    = shuffleArray([...Array(count).keys()]);
	const divisorMap  = new Array(count);
	
	let cursor = 0;
	groups.forEach((group, gi) => {
		const isLast  = gi === groups.length - 1;
		const slice   = isLast
		? count - cursor  // last group absorbs any rounding remainder
		: Math.round((group.weight / totalWeight) * count);
		
		for (let i = cursor; i < cursor + slice; i++) {
			divisorMap[shuffled[i]] = group.divisor;
		}
		cursor += slice;
	});
	
	return divisorMap;
};


/** 
* INERTIA SCROLL
*/

const inertiaScroll = (
	container,
	els,
	{
		navSelector,
		styles = DEFAULT_STYLES,
		groups = DEFAULT_GROUPS,
	} = {}
) => {
	if (!container) return;
	const windowHeight         = window.innerHeight;
	const adminBarHeight       = getAdminBarHeight();
	const navHeight            = getNavBarHeight(navSelector);
	const mainElementTopOffset = container.offsetTop - adminBarHeight - navHeight;
	const start                = Math.round(mainElementTopOffset - windowHeight);
	const stop                 = Math.round(windowHeight + start + container.offsetHeight);
	
	const divisorMap = assignGroups(els.length, groups);
	
	// single pass: style each element, snapshot its offset, attach its divisor
	const elData = Array.from(els, (el, i) => {
		styles.forEach(styleDef => applyRandomStyle(el, styleDef));
		return { el, originalOffset: el.offsetTop, divisor: divisorMap[i] };
	});

	console.log(elData);

	window.addEventListener('scroll', () => {
		const windowScroll = window.scrollY;
		const progress = windowScroll / stop;		
		container.style.setProperty('--on-screen-progress', `${progress}%`);
		console.log('progress: ', progress)		
		if (progress < 1) {
		    elData.forEach(({ el, originalOffset, divisor }) => {
				el.style.top = `${originalOffset - window.scrollY / divisor}px`;
			});
		}
	}, { passive: true });
};

/**
 * INIT INERTIA
 */

function initInertia() {
	const container = document.querySelector('.group__inertia-scroll');
	const els = Array.from(container?.querySelectorAll('figure') ?? []);
	inertiaScroll(container, els, {
	  navSelector: '.site-nav',
  
	  // optional — omit entirely to use defaults
	  styles: [
		{ prop: 'maxWidth',  min: 5,    max: 250, units: 'px'  },
		{ prop: 'top',       min: 30,   max: 100,  units: '%'   },
		{ prop: 'left',      min: -5,   max: 105, units: '%'   },
		{ prop: 'transform', min: -180, max: 180, units: 'deg', transformFn: 'rotate' },
	  ],
  
	  // 50 / 25 / 25 split — fast group gets double the elements
	  groups: [
		{ divisor: 1.125, weight: 2 },  // fast  — 50%
		{ divisor: 2,     weight: 1 },  // medium — 25%
		{ divisor: 4,     weight: 1 },  // slow   — 25%
	  ],
	});
  }
  
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initInertia);
} else {
	initInertia();
}
  