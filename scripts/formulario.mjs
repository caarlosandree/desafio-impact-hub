import './env.mjs';
import path from 'node:path';
import { chromium } from 'playwright';
import { RAIZ_PROJETO } from './env.mjs';

const BASE = process.env.N8N_URL ?? 'http://localhost:5678';

export async function enviarFormulario({ empresa, arquivos, vencimento, observacao }) {
  const email = process.env.N8N_MEMBRO_EMAIL || process.env.N8N_DONO_EMAIL;
  const senha = process.env.N8N_MEMBRO_SENHA || process.env.N8N_DONO_SENHA;
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  try {
    await pagina.goto(`${BASE}/signin`);
    await pagina.locator('input[type="email"], input[name="emailOrLdapLoginId"]').first().fill(email);
    await pagina.locator('input[type="password"]').first().fill(senha);
    await pagina.keyboard.press('Enter');
    await pagina.waitForURL((url) => !url.pathname.includes('signin'), { timeout: 30000 });
    await pagina.goto(`${BASE}/form/nf-envio`);
    await pagina.waitForLoadState('networkidle');
    const alvo = (await pagina.locator('iframe').count()) > 0 ? pagina.frameLocator('iframe').first() : pagina;
    await alvo.locator('select').first().selectOption(empresa);
    await alvo.locator('input[type="file"]').first().setInputFiles(arquivos.map((nome) => path.join(RAIZ_PROJETO, 'testdata/saida/arquivos', nome)));
    if (vencimento) await alvo.locator('input[type="date"]').first().fill(vencimento);
    if (observacao) await alvo.locator('textarea').first().fill(observacao);
    await alvo.getByRole('button', { name: 'Enviar' }).click();
    await alvo.getByText('Envio processado').waitFor({ timeout: 240000 });
    return await alvo.locator('body').innerText();
  } catch (erro) {
    await pagina.screenshot({ path: path.join(RAIZ_PROJETO, 'testes/formulario-falha.png'), fullPage: true });
    throw erro;
  } finally {
    await navegador.close();
  }
}
