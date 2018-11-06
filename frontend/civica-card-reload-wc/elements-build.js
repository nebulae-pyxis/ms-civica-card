const fs = require('fs-extra');
const concat = require('concat');
(async function build() {
    const files = [
        './dist/civica-card-reload-wc/runtime.js',
        './dist/civica-card-reload-wc/polyfills.js',
        './dist/civica-card-reload-wc/scripts.js',
        './dist/civica-card-reload-wc/main.js',
    ]
    await fs.ensureDir('elements')
    await concat(files, 'elements/afcc-reloader.js');
    await fs.copyFile('./dist/civica-card-reload-wc/styles.css', 'elements/styles.css')
    await fs.copy('./dist/civica-card-reload-wc/assets/', 'elements/assets/' )

})()
