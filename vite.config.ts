import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { injectFactsFragment, loadBodies } from './server';


function copyBodyImages(bodies: any[]) {
  const srcRoot = path.resolve(__dirname, 'data/bodies');
  const destRoot = path.resolve(__dirname, 'public/bodies');

  fs.mkdirSync(destRoot, { recursive: true });

  for (const body of bodies) {
    const bodyName = body.id; // adjust if your field is different

    const srcImage = path.join(srcRoot, bodyName, 'image.jpg');
    const destImage = path.join(destRoot, `${bodyName}.jpg`);

    if (!fs.existsSync(srcImage)) continue;

    const srcStat = fs.statSync(srcImage);
    const destStat = fs.existsSync(destImage)
      ? fs.statSync(destImage)
      : null;

    // Copy only if missing or outdated
    if (!destStat || srcStat.mtimeMs > destStat.mtimeMs) {
      fs.copyFileSync(srcImage, destImage);
    }

  }
}

export default defineConfig(({command}) => {

  return {
    base: command === 'build' ? '/voyager/' : '/',
    plugins: [
      {
        name: 'build-voyager',
        transformIndexHtml(html) {
          const bodies = loadBodies();
          const injectFacts = injectFactsFragment(bodies);

          // output the bodies into a JSON file
          const outputPath = path.resolve(__dirname, 'public/bodies.json');

          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, JSON.stringify(bodies, null, 2));

          // Copy images
          copyBodyImages(bodies);


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