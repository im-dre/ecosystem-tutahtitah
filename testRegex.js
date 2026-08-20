const itemName = 'Bawang Merah 1 KG'; 
const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
// Removed the ^\s*-\s* anchor to allow for numeric prefixes like '- 2. - '
const regex = new RegExp(escapedName + '.*?:\\s*Rp\\s*([\\d.,]+)', 'i'); 
const text = '- 2. - Bawang Merah 1 KG (1x): Rp 45.000\n- 3. - Beras 10 Kg (1x): Rp 75.000'; 
const lines = text.split('\n');
for (const line of lines) {
    const match = line.match(regex);
    console.log('Line:', line, '=> Match?', !!match, match && match[1]);
}
