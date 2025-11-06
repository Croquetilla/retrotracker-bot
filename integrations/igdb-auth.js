import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN_FILE = path.resolve('./igdb_token.json');

export async function refreshIGDBToken() {
  const now = Date.now();

  // 1️⃣ Comprobar si ya tenemos un token válido guardado
  if (fs.existsSync(TOKEN_FILE)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    if (now < data.expiration) {
      process.env.IGDB_TOKEN = data.token; // usar token existente
      console.log('🟢 Token IGDB válido cargado desde cache.');
      return;
    }
  }

  // 2️⃣ Generar un nuevo token
  console.log('🔄 Generando nuevo token de IGDB...');
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );

  const data = await res.json();
  if (!data.access_token) {
    console.error('❌ No se pudo generar el token de IGDB:', data);
    return;
  }

  const expiration = now + data.expires_in * 1000;
  const tokenData = { token: data.access_token, expiration };

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
  process.env.IGDB_TOKEN = data.access_token;

  console.log('✅ Token IGDB actualizado correctamente.');
}
