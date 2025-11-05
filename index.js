import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import { testDB, pool } from './db.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Cargar comandos dinámicamente
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

async function main() {
  // 👇 Aquí probamos la conexión a la base de datos
  await testDB();

  await loadCommands();

  client.once(Events.ClientReady, c => {
    console.log(`✅ Bot conectado como ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('❌ Error ejecutando comando:', err);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Error interno', ephemeral: true });
      }
    }
  });

  await client.login(process.env.TOKEN);
}

// Llamamos a main() para iniciar todo
main();
