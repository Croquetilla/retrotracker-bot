import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

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
       ORDER BY ultima_actualizacion DESC
       LIMIT 10`,
      [jugador]
    );

    if (result.rowCount === 0)
      return interaction.reply({
        content: '📭 No tienes juegos registrados aún.',
        ephemeral: true
      });

    const embed = new EmbedBuilder()
      .setColor(0x00BFFF) // Azul retro
      .setTitle(`🎮 Progreso de ${jugador}`)
      .setDescription('Aquí están tus últimos juegos actualizados:')
      .setFooter({ text: 'RetroTracker Bot • NeonDB', iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    for (const juego of result.rows) {
      const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      embed.addFields({
        name: `🕹️ ${juego.titulo}`,
        value: `**Progreso:** ${juego.progreso}%\n**Plataforma:** ${juego.plataforma ?? 'N/A'}\n**Última actualización:** ${fecha}\n${juego.notas ? `📝 ${juego.notas}` : ''}`,
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
