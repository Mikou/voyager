import fs from 'fs';
import path from 'path';
import { logRadius } from './src/utils';
import { html } from '@rbardini/html';

import { PIXELS_PER_DECADE, MERGE_THRESHOLD } from './src/const';
import type { Body } from './src/types';

const bodiesDir = path.resolve(__dirname, 'data/bodies');

type Section = {
  type: 'section';
  top: number;
  className: string;
  bodies: Body[];
};

type Boost = {
  type: 'boost';
  top: number;
}

export function loadBodies() {
  const bodies = fs.readdirSync(bodiesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const id = dirent.name;
      const bodyPath = path.join(bodiesDir, id);

      const dataJsonPath = path.join(bodyPath, 'data.json');
      const readmePath = path.join(bodyPath, 'README.md');

      try {
        let data;

        let name = null;

        if (!fs.existsSync(dataJsonPath)) {
          return null;
        } else {
          data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf-8'));
          
          // we need at least the radius
          if (
            typeof data.radius !== 'number' &&
            typeof data.height !== 'number'
          ) return null;

          name = typeof data.name === 'string' ? 
                 data.name : id;
        }

        let text = '';

        if (fs.existsSync(readmePath)) {
          text = fs.readFileSync(readmePath, 'utf-8');
        }

        return {
          isAstronaut: Boolean(data.height),
          id,
          name,
          text,
          color: data.color || "#eeeeee",
          radius: data.radius || data.height
        }
      } catch(e) {
        console.warn(e);
        return null;
      }

    })
    .filter((body): body is Body => body !== null);
  return bodies.sort((a, b) => a.radius - b.radius);
}

function renderFact(body:Body) {
  return body.isAstronaut ? 
    `
      <div class="fact astronaut">
        <div>
          <h2>${body.name}</h2>
          height: <strong>${body.radius}</strong>
          <div>
            ${body.text}
          </div>
        </div>
      </div>
    `
  : `
    <div class="fact">
      <div class="image">
        <img src="/bodies/${body.id}.jpg" alt="${body.name}" />
      </div>
      <div>
        <h2>${body.name}</h2>
        radius: <strong>${body.radius}</strong>
        <div>
          ${body.text}
        </div>
      </div>
    </div>
  `;
}

function renderFacts(bodies:Body[]):string {
  return html`${bodies.map(body => renderFact(body))}`;
}

function renderSection(section: Section | Boost) {
  if(section.type === 'section') {
    return html`
      <section style="top:${section.top.toFixed(2)}px;" class="${section.type}">
        ${renderFacts(section.bodies)}
      </section>`;
  } else {
    return html`
      <div style="top:${section.top.toFixed(2)}px;" class="${section.type}">
        Keep scrolling...
      </div>`;
  }
}

function renderSections(sections: (Section | Boost)[]): string {
  return html`${sections.map(section => renderSection(section))}`;
}

function groupSections(bodies:Body[]): Section[] {
  const sections: Section[] = [];
  let previousY: number | null = null;

  const logRadii = bodies.map(o => logRadius(o.radius));
  const logMin = Math.min(...logRadii);
  const logMax = Math.max(...logRadii);
  const logRange = logMax - logMin;
  const totalScrollHeight = logRange * PIXELS_PER_DECADE;

  bodies.forEach(body => {
    const t = (logRadius(body.radius) - logMin) / logRange;
    const y = t * totalScrollHeight;

    const needsNewSection =
      previousY === null || Math.abs(y - previousY) >= MERGE_THRESHOLD;

    if (needsNewSection) {
      sections.push({
        type:'section',
        top: y,
        className: body.id,
        bodies: []
      });
    }

    sections[sections.length - 1].bodies.push(body);

    previousY = y;
  });

  return sections;
}

function insertBoost(sections: Section[]): (Section | Boost)[] {
  const result: (Section | Boost)[] = [];
  const STEP = PIXELS_PER_DECADE;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const prev = sections[i - 1];

    if (prev) {
      const distance = section.top - prev.top;
      const boostCount = Math.floor(distance / STEP);

      for (let j = 1; j < boostCount; j++) {
        result.push({
          type: 'boost',
          top: prev.top + j * STEP,
        });
      }
    }

    result.push(section);
  }

  return result;
}

function positionFacts(bodies:Body[]):string {
  const sections = groupSections(bodies);
  const sectionsWithBreak = insertBoost(sections);
  return html`${renderSections(sectionsWithBreak)}`;
}

export function injectFactsFragment(bodies:Body[]) {
  return html`
    <header class="header">
      <div class="content">
        <h1>Hey, hvor stor er du egenligt, lille?</h1>
        <h2>Husk at hvis du skal doom-scrolle, så kan du lige så godt kigge på noget interessant</h2>
      </div>
    </header>

    <main class="main">
      <div class="content">
        <div id="bodies"></div>
        <!-- inject:facts -->
        <div id="facts">${positionFacts(bodies)}</div>
      </div>
    </main>

    <footer class="footer">
      <div class="content">
        Footer content
      </div>
    </footer>

    `;
}

export function injectBodiesScript(bodies:Body[]) {
  return `
    <script type="module">
      import {run} from './src/main.ts';
      const bodies=${JSON.stringify(bodies)};
      run(bodies);
    </script>
    `;
}