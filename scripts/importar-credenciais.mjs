import './env.mjs';
import { execFileSync } from 'node:child_process';
import { exigir } from './env.mjs';

const modoGemini = process.argv.find((argumento) => argumento.startsWith('--gemini='))?.split('=')[1];
exigir('GEMINI_API_KEY', ...(modoGemini ? [] : ['GMAIL_TESTE', 'SMTP_SENHA_APP', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']));

const google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
const gemini = {
  id: 'nfGeminiApiKey01', name: 'NF · Gemini API', type: 'httpHeaderAuth',
  data: { name: 'x-goog-api-key', value: modoGemini === 'invalida' ? 'chave-invalida-para-o-teste-T19' : process.env.GEMINI_API_KEY },
};
const credenciais = modoGemini ? [gemini] : [
  { id: 'nfGmailOAuth0001', name: 'NF · Gmail', type: 'gmailOAuth2', data: google },
  { id: 'nfPlanilhasOAuth', name: 'NF · Google Planilhas', type: 'googleSheetsOAuth2Api', data: google },
  { id: 'nfDriveOAuth0001', name: 'NF · Google Drive', type: 'googleDriveOAuth2Api', data: google },
  gemini,
  { id: 'nfSmtpAlertas001', name: 'NF · SMTP alertas', type: 'smtp', data: { user: process.env.GMAIL_TESTE, password: process.env.SMTP_SENHA_APP, host: 'smtp.gmail.com', port: 465, secure: true } },
];

execFileSync('docker', ['exec', '-i', 'nf-n8n', 'sh', '-c', 'umask 077; cat > /tmp/credenciais-nf.json'], { input: JSON.stringify(credenciais) });
try {
  execFileSync('docker', ['exec', 'nf-n8n', 'n8n', 'import:credentials', '--input=/tmp/credenciais-nf.json'], { stdio: 'inherit' });
} finally {
  execFileSync('docker', ['exec', 'nf-n8n', 'rm', '-f', '/tmp/credenciais-nf.json']);
}
console.log(modoGemini ? `Credencial do Gemini importada (${modoGemini}).` : 'Credenciais importadas. Conecte as três credenciais do Google no n8n.');
