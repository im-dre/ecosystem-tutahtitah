const fs = require('fs');
const path = 'c:/tutahtitah-ecosystem/aplikasi_internal/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /className="([^"]+)"(>.*?Rp|<span[^>]*>{calculateDuration|<h3[^>]*>{adminAnalytics\.avgDuration)/g;

let count = 0;
content = content.replace(regex, (match, p1, p2) => {
    if (!p1.includes('notranslate')) {
        count++;
        return `className="${p1} notranslate"${p2}`;
    }
    return match;
});

// For those that match `className="..."` but have `\n` before the content, the regex above doesn't catch them easily if `.` doesn't match newlines. But they are usually on the same line.
// Let's use a simpler approach since we know the structure of the lines from the grep output.
const lines = content.split('\n');
let replacedLines = 0;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if ((line.includes('.toLocaleString') || line.includes('Rp') || line.includes('calculateDuration') || line.includes('avgDuration')) && line.includes('className=')) {
        // Find className="..." 
        // We only want to add notranslate if the element contains financial text or duration text
        // Let's assume if a line has className= and Rp/duration, it's the target line.
        if (line.match(/className="([^"]+)"/) && !line.includes('notranslate')) {
            // Replace the last className="([^"]+)" before the target text on that line?
            // Actually it's easier to just replace all `className="` with `className="notranslate ` on those specific lines.
            // Wait, there could be multiple elements on the same line.
            // Let's just use regex for the whole file:
        }
    }
}

// Better approach with replace using a function
let finalContent = fs.readFileSync(path, 'utf8');
let replaced = 0;
finalContent = finalContent.replace(/(className=")([^"]+)(">\s*(?:-\s*)?(?:Rp|{calculateDuration|{adminAnalytics\.avgDuration))/g, (match, p1, p2, p3) => {
    if (!p2.includes('notranslate')) {
        replaced++;
        return `${p1}${p2} notranslate${p3}`;
    }
    return match;
});

// For Rp that are inside paragraph or spans where there might be spaces
finalContent = finalContent.replace(/(className=")([^"]+)(">\s*(?:-\s*)?Rp\s*{)/g, (match, p1, p2, p3) => {
    if (!p2.includes('notranslate')) {
        replaced++;
        return `${p1}${p2} notranslate${p3}`;
    }
    return match;
});

fs.writeFileSync(path, finalContent, 'utf8');
console.log('Replaced elements:', replaced);
