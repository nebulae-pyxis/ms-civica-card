const fs = require('fs-extra');
const concat = require('concat');
const project = 'civica-card-reload-wc';

(async function build() {
    const files = [
        'runtime',
        'scripts',
        'polyfills',
        'main'
    ];

    await fs.ensureDir('./bundle');

    const jsFiles = files.map(f => `./dist/${project}/${f}.js`);
    await concat(jsFiles, `./bundle/${project}.bundle.js`);
    await fs.copyFile(`./dist/${project}/styles.css`, `./bundle/${project}.css`);
   
    await fs.copy('./bundle/', `../shell/src/assets/${project}/`);
})();