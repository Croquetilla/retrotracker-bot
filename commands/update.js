import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.mjs';

export const data = new SlashCommandBuilder()
  .setName('update')
  .setDescription('Actualiza tu progreso de un juego.')
  .addStringOption(opt => opt.setName('titulo').setDescription('Título del juego').setRequired(true))
  .addIntegerOption(opt => opt.setName('progreso').setDescription('Porcentaje completado (0–100)').setRequired(true));

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const progreso = interaction.options.getInteger('progreso');
  const jugador = interaction.user.username;

  try {
    const result = await pool.query(
      `UPDATE juegos
       SET progreso = $1, ultima_actualizacion = NOW()
       WHERE LOWER(titulo) = LOWER($2) AND jugador = $3`,
      [progreso, titulo, jugador]
    );

    if (result.rowCount === 0)
      return interaction.reply('⚠️ No encontré ese juego en tu registro.');

    await interaction.reply(`✅ Progreso actualizado: **${titulo}** → ${progreso}%`);
  } catch (err) {
    console.error('❌ Error en /update:', err);
    await interaction.reply('Hubo un error al actualizar el progreso.');
  }
}
