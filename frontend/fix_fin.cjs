const fs = require('fs');
const path = require('path');
const p = path.join('c:', 'Projetos_programacao', 'PetFlow', 'frontend', 'src', 'pages', 'Financeiro.tsx');
let content = fs.readFileSync(p, 'utf8');

const startStr = "<Dialog open={isNewCobrancaOpen}";
const endStr = "{/* Resumo Financeiro */}";

const startIdx = content.indexOf(startStr);
const endIdx = content.lastIndexOf("</Dialog>", content.indexOf(endStr));

if (startIdx !== -1 && endIdx !== -1) {
    const newBtn = '<Button onClick={() => window.location.href="/financeiro/nova-cobranca"} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Nova Cobrança</Button>\n';
    content = content.substring(0, startIdx) + newBtn + content.substring(endIdx + 9);
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed Financeiro.tsx');
} else {
    console.log(`Could not find bounds: startIdx=${startIdx}, endIdx=${endIdx}`);
}
