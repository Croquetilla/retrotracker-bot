import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('buscarjuego')
  .setDescription('Busca juegos por palabra clave en tus registros.')
  .addStringOption(opt =>
    opt
      .setName('palabra')
      .setDescription('Palabra o parte del título a buscar')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('jugador')
      .setDescription('Nombre del jugador (opcional)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const palabra = interaction.options.getString('palabra');
  const jugadorConsulta =
    interaction.options.getString('jugador') || interaction.user.username;

  try {
    const result = await pool.query(
      `SELECT titulo, plataforma, progreso, ultima_actualizacion, imagen_url
       FROM juegos
       WHERE LOWER(titulo) ILIKE LOWER($1)
       AND LOWER(jugador) = LOWER($2)
       ORDER BY ultima_actualizacion DESC
       LIMIT 10`,
      [`%${palabra}%`, jugadorConsulta]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: `📭 No encontré juegos que coincidan con “${palabra}” para **${jugadorConsulta}**.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🔍 Resultados de búsqueda para “${palabra}”`)
      .setDescription(`Mostrando los ${result.rowCount} juegos más recientes de **${jugadorConsulta}**.`)
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    for (const juego of result.rows) {
      const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      embed.addFields({
        name: `🎮 ${juego.titulo}`,
        value: `📈 ${juego.progreso ?? 0}% • 🕹️ ${
          juego.plataforma ?? 'N/A'
        } • 🕓 ${fecha}`,
        inline: false
      });
    }

    // Mostrar miniatura si hay una sola coincidencia con imagen
    if (result.rowCount === 1 && result.rows[0].imagen_url) {
      embed.setThumbnail(result.rows[0].imagen_url);
    }

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /buscarjuego:', err);
    await interaction.reply({
      content: 'Hubo un error al buscar juegos.',
      ephemeral: true
    });
  }
}
