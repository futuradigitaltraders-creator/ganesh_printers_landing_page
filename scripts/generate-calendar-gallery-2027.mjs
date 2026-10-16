// Regenerate the website's 2027 calendar gallery index from existing GitHub image folders.
// This script never moves, replaces, or deletes images.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const definitions = [
  { id: 'christian', title: 'Christian Calendars', subtitle: 'FUTURA Christian designs, Bible calendars and diaries', folder: 'images/2026 CHRISTIAN CALENDARS' },
  { id: 'yanai', title: 'Yanai Calendars', subtitle: 'Gold, 10×15, 11×17, 12×18, 14×24, 20×30 and sheeter', folder: 'images/2026 YANAI CALENDARS' },
  { id: 'geetha', title: 'Geetha Lamination', subtitle: 'GEM finishing, special designs and price lists', folder: 'images/2026 GEEETHA LAMINATION' },
  { id: 'shree', title: 'Shree Printography', subtitle: 'Daily mount, monthly calendars, diaries and catalogues', folder: 'images/SHREE PRINTOGRAPHY CALENDARS' }
];

const slash = value => value.split(sep).join('/');
const isAsset = name => /\.(jpe?g|png|webp|gif|avif|pdf)$/i.test(name);
function getFiles(directory) {
  if (!existsSync(directory)) throw new Error('Missing calendar image folder: ' + directory);
  const result = [];
  function descend(folder) {
    for (const item of readdirSync(folder, { withFileTypes: true })) {
      const full = join(folder, item.name);
      if (item.isDirectory()) descend(full);
      else if (item.isFile() && isAsset(item.name)) {
        const path = slash(relative(process.cwd(), full));
        const categoryPath = slash(relative(directory, folder));
        result.push({
          path,
          name: item.name,
          category: categoryPath === '' ? 'Main Collection' : categoryPath.split('/').join(' / '),
          type: /\.pdf$/i.test(item.name) ? 'pdf' : 'image'
        });
      }
    }
  }
  descend(directory);
  return result.sort((a,b) => a.path.localeCompare(b.path, 'en', { numeric: true, sensitivity: 'base' }));
}
const collections = definitions.map(def => ({ ...def, files: getFiles(join(process.cwd(), def.folder)) }));
const output = join(process.cwd(), 'assets/calendar-gallery-2027.json');
writeFileSync(output, JSON.stringify({ collections }, null, 2) + '\n');
console.log('Calendar gallery index regenerated:', collections.map(g =>
  g.title + ': ' + g.files.filter(f => f.type === 'image').length + ' images'
).join(', '));
