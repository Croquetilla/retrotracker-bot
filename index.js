// Cargar variables de entorno
import 'dotenv/config';

// Importar clases de Discord.js
import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';

// Importar utilidades del sistema
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testDB, pool } from './db.mjs';

// Resolver __dirname en módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear cliente de Discord con intenciones básicas
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Crear colección de comandos
client.commands = new Collection();

// Función para cargar comandos dinámicamente
async function loadCommands() {
  try {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) {
      console.warn('⚠️ Carpeta /commands no encontrada.');
      return;
    }

    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter(file => file.endsWith('.js') || file.endsWith('.mjs'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const commandModule = await import(`file://${filePath}`);

      // Admite exportaciones de tipo ESM o CommonJS
      const command = commandModule.default || commandModule;

      if (command?.data?.name && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
        console.log(`🟢 Comando cargado: ${command.data.name}`);
      } else {
        console.warn(`⚠️ El archivo ${file} no exporta correctamente (data/execute).`);
      }
    }
  } catch (err) {
    console.error('❌ Error cargando comandos:', err);
  }
}

// Inicializar bot
async function main() 
  await testDB();{
  await loadCommands();

  // Evento: el bot está listo
  client.once(Events.ClientReady, c => {
    console.log(`✅ Bot conectado como ${c.user.tag}`);
  });

  // Evento: se ejecuta un Slash Command
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('❌ Error ejecutando comando:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Hubo un error al ejecutar este comando.',
          ephemeral: true,
        });
      }
    }
  });

  // Iniciar sesión con el token
  try {
    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error('❌ Error iniciando sesión en Discord:', err);
  }
}

// Ejecutar el bot
main();
