import { defineConfig } from 'vite';
import { injectFactsFragment, injectBodiesScript, loadBodies } from './server';

export default defineConfig(() => {

  let cachedBodies: any = null;  // Cache the loaded data

  const getBodies = () => {
    if (!cachedBodies) {
      cachedBodies = loadBodies();
    }
    return cachedBodies;
  };

  return {
    base: '/voyager/',
    plugins: [
      {
        name: 'dynamic-html-data',
        transformIndexHtml(html) {
          const bodies = getBodies();
          const injectFacts = injectFactsFragment(bodies);
          const injectBodies = injectBodiesScript(bodies);

          return html
            .replace('<!-- inject:facts -->', injectFacts)
            .replace('<!-- inject:bodies-script -->', injectBodies)
          ;

        },
        handleHotUpdate({ file, server }) {
          if (file.includes('/data/')) {
            cachedBodies = null;
            server.ws.send({ type: 'full-reload' });
          }
        },
      }
    ],
  };
});