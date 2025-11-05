import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.mjs';

export const data = new SlashCommandBuilder()
  .setName('progreso')
  .setDescription('Muestra tu progreso en los juegos registrados.');

export async function execute(interaction) {
  const jugador = interaction.user.username;

  try {
    const result = await pool.query(
      `SELECT titulo, progreso, ultima_actualizacion
       FROM juegos WHERE jugador = $1 ORDER BY ultima_actualizacion DESC`,
      [jugador]
    );

    if (result.rowCount === 0)
      return interaction.reply('📭 No tienes juegos registrados aún.');

    const lista = result.rows
      .map(r => `🎮 **${r.titulo}** — ${r.progreso}% (última actualización: ${r.ultima_actualizacion.toLocaleString()})`)
      .join('\n');

    await interaction.reply(`📊 Progreso de ${jugador}:\n${lista}`);
  } catch (err) {
    console.error('❌ Error en /progreso:', err);
    await interaction.reply('Hubo un error al obtener tu progreso.');
  }
}
