import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.mjs';

export const data = new SlashCommandBuilder()
  .setName('progreso')
  .setDescription('Muestra tu progreso en los juegos registrados.');

export async function execute(interaction) {
  const jugador = interaction.user.username;

  try {
    const result = await pool.query(
      `SELECT titulo, progreso, ultima_actualizacion, plataforma, notas
       FROM juegos
       WHERE jugador = $1
       ORDER BY ultima_actualizacion DESC`,
      [jugador]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: '📭 No tienes juegos registrados aún.',
        ephemeral: true
      });
    }

    // 🎨 Calcular el color dinámico según promedio de progreso
    const promedio =
      result.rows.reduce((total, juego) => total + (juego.progreso || 0), 0) /
      result.rowCount;

    let color;
    if (isNaN(promedio)) {
      color = 0x808080; // gris si no hay datos válidos
    } else if (promedio >= 80) {
      color = 0x00ff7f; // verde
    } else if (promedio >= 50) {
      color = 0xffd700; // amarillo
    } else {
      color = 0xff4500; // rojo
    }

    // 🎨 Embed principal
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎮 Progreso de ${jugador}`)
      .setDescription(
        `Aquí están tus juegos más recientes.\n\n**Progreso medio:** ${promedio.toFixed(
          1
        )}%`
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Añadir los juegos uno a uno
    for (const juego of result.rows) {
      const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      embed.addFields({
        name: `🕹️ ${juego.titulo}`,
        value: `**Progreso:** ${juego.progreso ?? 0}%\n**Plataforma:** ${
          juego.plataforma ?? 'N/A'
        }\n**Última actualización:** ${fecha}\n${
          juego.notas ? `📝 ${juego.notas}` : ''
        }`,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /progreso:', err);
    await interaction.reply({
      content: 'Hubo un error al obtener tu progreso.',
      ephemeral: true
    });
  }
}
