import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.mjs';

export const data = new SlashCommandBuilder()
  .setName('addjuego')
  .setDescription('Añade un nuevo juego al registro.')
  .addStringOption(opt => opt.setName('titulo').setDescription('Título del juego').setRequired(true))
  .addIntegerOption(opt => opt.setName('anio').setDescription('Año de lanzamiento'))
  .addStringOption(opt => opt.setName('plataforma').setDescription('Plataforma principal'))
  .addStringOption(opt => opt.setName('ambientacion').setDescription('Ambientación o estilo'))
  .addStringOption(opt => opt.setName('retroarch_url').setDescription('URL del juego en RetroArch'))
  .addStringOption(opt => opt.setName('notas').setDescription('Notas adicionales'));

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const anio = interaction.options.getInteger('anio');
  const plataforma = interaction.options.getString('plataforma');
  const ambientacion = interaction.options.getString('ambientacion');
  const retroarch_url = interaction.options.getString('retroarch_url');
  const notas = interaction.options.getString('notas');
  const jugador = interaction.user.username;

  try {
    await pool.query(
      `INSERT INTO juegos (titulo, anio, plataforma, ambientacion, retroarch_url, jugador, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [titulo, anio, plataforma, ambientacion, retroarch_url, jugador, notas]
    );

    await interaction.reply(`🎮 Juego **${titulo}** añadido correctamente por ${jugador}.`);
  } catch (err) {
    console.error('❌ Error en /addjuego:', err);
    await interaction.reply('Hubo un error al añadir el juego.');
  }
}
