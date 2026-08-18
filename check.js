const fs = require('fs');
const content = fs.readFileSync('c:/tutahtitah-ecosystem/aplikasi_internal/src/App.jsx', 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Rp') || line.includes('calculateDuration') || line.includes('avgDuration')) {
        if (line.match(/className=["'`]/) && !line.includes('notranslate')) {
            console.log(i + 1, ':', line.trim());
        }
    }
}
