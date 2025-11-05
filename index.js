import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Colección para guardar los comandos
client.commands = new Collection();

// Cargar los comandos desde /commands
const commandsPath = path.resolve('./commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Cuando el bot esté listo
client.once(Events.ClientReady, c => {
  console.log(`✅ Bot conectado como ${c.user.tag}`);
});

// Cuando alguien use un Slash Command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Hubo un error al ejecutar este comando.',
      ephemeral: true
    });
  }
});

// Conectar el bot
client.login(process.env.TOKEN);
