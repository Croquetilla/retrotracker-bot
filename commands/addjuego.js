import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('addjuego')
  .setDescription('Añade un nuevo juego al registro.')
  .addStringOption(opt => opt.setName('titulo').setDescription('Título del juego').setRequired(true))
  .addIntegerOption(opt => opt.setName('anio').setDescription('Año de lanzamiento'))
  .addStringOption(opt => opt.setName('plataforma').setDescription('Plataforma principal'))
  .addStringOption(opt => opt.setName('ambientacion').setDescription('Ambientación o género'))
  .addStringOption(opt => opt.setName('retroarch_url').setDescription('URL del juego en RetroArch'))
  .addStringOption(opt => opt.setName('notas').setDescription('Notas adicionales'))
  .addStringOption(opt => opt.setName('imagen_url').setDescription('Imagen o portada del juego (opcional)'));

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const anio = interaction.options.getInteger('anio');
  const plataforma = interaction.options.getString('plataforma');
  const ambientacion = interaction.options.getString('ambientacion');
  const retroarch_url = interaction.options.getString('retroarch_url');
  const notas = interaction.options.getString('notas');
  const imagen_url = interaction.options.getString('imagen_url');
  const jugador = interaction.user.username;

  try {
    // Guardar en base de datos
    await pool.query(
      `INSERT INTO juegos (titulo, anio, plataforma, ambientacion, retroarch_url, jugador, notas, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [titulo, anio, plataforma, ambientacion, retroarch_url, jugador, notas, imagen_url]
    );

    // Crear un embed visual de confirmación
    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🎮 ${titulo}`)
      .setDescription(`Juego añadido correctamente por **${jugador}**`)
      .addFields(
        { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: ambientacion || 'N/A', inline: true },
        { name: '📅 Año de lanzamiento', value: anio ? anio.toString() : 'N/A', inline: true }
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    if (retroarch_url)
      embed.addFields({
        name: '🔗 RetroArch',
        value: `[Abrir juego](${retroarch_url})`
      });

    if (notas)
      embed.addFields({ name: '📝 Notas', value: notas });

    if (imagen_url)
      embed.setThumbnail(imagen_url);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /addjuego:', err);
    await interaction.reply({
      content: 'Hubo un error al añadir el juego.',
      ephemeral: true
    });
  }
}
