// --- Configuración base ---
import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import { testDB, pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { refreshIGDBToken } from './integrations/igdb-auth.js'; // 👈 Nuevo módulo
import { ensureCacheFile } from './integrations/cache.js'; // 👈 Inicializa la caché local

// --- Rutas base ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Cliente Discord ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// --- Función: cargar comandos dinámicamente ---
async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) return;

  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(`file://${filePath}`);
    const command = commandModule.default || commandModule;

    if (command?.data?.name && typeof command.execute === 'function') {
      client.commands.set(command.data.name, command);
      console.log(`🟢 Comando cargado: ${command.data.name}`);
    }
  }
}

// --- Función principal ---
async function main() {
  // ✅ 1. Comprobar conexión a la base de datos
  await testDB();

  // ✅ 2. Inicializar caché de integraciones
  ensureCacheFile();

  // ✅ 3. Refrescar token de IGDB automáticamente si ha caducado
  await refreshIGDBToken();

  // ✅ 4. Cargar comandos de la carpeta /commands
  await loadCommands();

  // ✅ 5. Eventos del bot
  client.once(Events.ClientReady, c => {
    console.log(`✅ Bot conectado como ${c.user.tag}`);
  });

  // ✅ 6. Manejador de interacciones (slash commands)
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('❌ Error ejecutando comando:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Error interno del bot.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Error interno del bot.', ephemeral: true });
      }
    }
  });

  // ✅ 7. Iniciar sesión con el bot
  await client.login(process.env.TOKEN);
}

// 🚀 Iniciar todo
main();
