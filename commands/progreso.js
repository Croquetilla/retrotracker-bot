import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('progreso')
  .setDescription('Muestra tu progreso en los juegos registrados.');

export async function execute(interaction) {
  const jugador = interaction.user.username;

  try {
    // 1️⃣ Obtener los progresos del jugador con JOIN a la tabla de juegos
    const result = await pool.query(
      `SELECT j.titulo, j.plataforma, j.imagen_url, p.progreso, p.progreso_retroachievements, 
              p.ultima_actualizacion, p.notas
       FROM progresos_usuario p
       JOIN juegos j ON j.id = p.juego_id
       WHERE p.jugador = $1
       ORDER BY p.ultima_actualizacion DESC`,
      [jugador]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: '📭 No tienes juegos registrados aún. Usa /addjuego para empezar.',
        ephemeral: true
      });
    }

    // 2️⃣ Calcular promedio de progreso
    const promedio =
      result.rows.reduce((total, juego) => total + (juego.progreso || 0), 0) /
      result.rowCount;

    let color;
    if (isNaN(promedio)) color = 0x808080;
    else if (promedio >= 80) color = 0x00ff7f;
    else if (promedio >= 50) color = 0xffd700;
    else color = 0xff4500;

    // 3️⃣ Crear embed principal
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎮 Progreso de ${jugador}`)
      .setDescription(
        `Estos son tus juegos registrados y su progreso.\n\n**Progreso medio:** ${promedio.toFixed(
          1
        )}%`
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // 4️⃣ Añadir juegos individuales
    for (const juego of result.rows) {
      const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      let progresoTexto = `**Progreso manual:** ${juego.progreso ?? 0}%`;
      if (juego.progreso_retroachievements)
        progresoTexto += `\n**RA:** ${juego.progreso_retroachievements}%`;

      embed.addFields({
        name: `🕹️ ${juego.titulo}`,
        value: `${progresoTexto}\n**Plataforma:** ${
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
      content: 'Hubo un error al obtener tus progresos.',
      ephemeral: true
    });
  }
}
