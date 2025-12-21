import { lerp, logRadius, zoomForRadius } from './utils';
import type { Body } from './types';
import { PIXELS_PER_DECADE } from './const';

export function run(bodies:Body[]) {
  console.log("app running");
  const DEFAULT_RADIUS = 150;
  const MIN_VISIBLE_SIZE = 10;
  const MAX_VISIBLE_SIZE = 1500;
  const SCROLL_TAIL_FACTOR = 1; // multiple of viewport height

  const $header = document.querySelector<HTMLElement>(".header")!;
  const $facts = document.querySelector<HTMLElement>(".main #facts")!;
  const $bodies = document.querySelector<HTMLDivElement>(".main #bodies")!;

  // used for caching HTML elements
  let bodyElements: { body: Body; el: HTMLElement; }[];

  const smallestRadius = Math.min(...bodies.map(b => b.radius));
  const largestRadius = Math.max(...bodies.map(b => b.radius));

  const zoomMin = zoomForRadius(smallestRadius, DEFAULT_RADIUS);
  const zoomMax = zoomForRadius(largestRadius, DEFAULT_RADIUS);

  const logRadii = bodies.map(b => logRadius(b.radius));
  const logMin = Math.min(...logRadii);
  const logMax = Math.max(...logRadii);
  const logRange = logMax - logMin;

  const animatedScrollHeight = logRange * PIXELS_PER_DECADE;
  const tailHeight = window.innerHeight * SCROLL_TAIL_FACTOR;
  const totalAnimationHeight = animatedScrollHeight + tailHeight;

  $facts.style.height = `${animatedScrollHeight + tailHeight}px`;

  function updateScene(percent: number) {

    // use cached HTML elements first
    if(!bodyElements) {
      bodyElements = bodies.map(body => ({
        body,
        el: document.querySelector<HTMLElement>(`.body.${body.id}`)!
      }));
    }

    const t = percent / 100;
    const zoomExp = lerp(zoomMin, zoomMax, t);
    const zoomFactor = Math.pow(10, zoomExp) * 1e-6;
    bodyElements.forEach(({ body, el }) => {
      const r = body.radius * zoomFactor;

      el.style.display = (r < MIN_VISIBLE_SIZE || r > MAX_VISIBLE_SIZE) ? 'none' : 'block';
      if (el.style.display === 'block') {
        el.style.bottom = '20px';
        el.style.left = `calc(50% - ${r}px)`;
        el.style.width = `${r * 2}px`;
        el.style.height = `${r * 2}px`;
      }
    });
  }

  function getScrollPercent(): number {
    const headerHeight = $header.offsetHeight;
    const offset = Math.max(0, window.scrollY - headerHeight);
    const clampedOffset = Math.min(offset, totalAnimationHeight);
    return (clampedOffset / animatedScrollHeight) * 100;
  }

  function createObjectElements() {
    $bodies.innerHTML = bodies
      .map(body => `<div class="body ${body.id}">${body.id}</div>`)
      .join('\n');
  }

  function init() {

    createObjectElements();
    updateScene(0);

    let ticking = false;

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateScene(getScrollPercent());
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  init();

}

async function loadBodies() {
  const response = await fetch('/bodies.json');
  if (!response.ok) throw new Error('Failed to load bodies');
  return response.json();
}

// Example usage
loadBodies().then((bodies) => {
  console.log(bodies);
  run(bodies)
});