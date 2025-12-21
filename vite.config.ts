import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { injectFactsFragment, loadBodies } from './server';

export default defineConfig(({command}) => {

  let cachedBodies: any = null;  // Cache the loaded data

  const getBodies = () => {
    if (!cachedBodies) {
      cachedBodies = loadBodies();
    }
    return cachedBodies;
  };

  return {
    base: command === 'build' ? '/voyager/' : '/',
    plugins: [
      {
        name: 'build-voyager',
        transformIndexHtml(html) {
          const bodies = getBodies();
          const injectFacts = injectFactsFragment(bodies);

          // output the bodies into a JSON file
          const outputPath = path.resolve(__dirname, 'public/bodies.json');

          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, JSON.stringify(bodies, null, 2));

          return [
            {
              tag:'div',
              injectTo:'body-prepend',
              children: injectFacts
            },
            {
              tag:'script',
              injectTo:'body',
              children: `const bodies = ${JSON.stringify(bodies)}`
            }
          ]

        },
        handleHotUpdate({ file, server }) {
          if (file.includes('/data/')) {
            server.ws.send({ type: 'full-reload' });
          }
        },
      }
    ],
  };
});