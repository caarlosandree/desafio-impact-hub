import './env.mjs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { RAIZ_PROJETO, exigir } from './env.mjs';
import { CASOS } from '../testdata/casos.mjs';
import { EMPRESAS } from '../testdata/dados.mjs';

export async function enviarCaso(caso) {
  exigir('GMAIL_TESTE', 'SMTP_SENHA_APP');
  const transporte = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.GMAIL_TESTE, pass: process.env.SMTP_SENHA_APP } });
  await transporte.sendMail({
    from: `Fornecedor fictício <${process.env.GMAIL_TESTE}>`,
    to: EMPRESAS[caso.empresa].email,
    subject: `[${caso.id}] ${caso.assunto}`,
    text: caso.corpo || ' ',
    attachments: caso.anexos.map((nome) => ({ filename: nome, path: path.join(RAIZ_PROJETO, 'testdata/saida/arquivos', nome) })),
  });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  for (const id of process.argv.slice(2)) {
    const caso = CASOS.find((item) => item.id === id);
    if (!caso?.anexos) throw new Error(`Caso sem e-mail: ${id}`);
    await enviarCaso(caso);
    console.log(`${id} enviado para ${EMPRESAS[caso.empresa].email}`);
  }
}
