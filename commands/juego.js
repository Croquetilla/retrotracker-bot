import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.mjs';

export const data = new SlashCommandBuilder()
  .setName('juego')
  .setDescription('Muestra información detallada de un juego.')
  .addStringOption(opt =>
    opt
      .setName('titulo')
      .setDescription('Nombre del juego que quieres consultar')
      .setRequired(true)
  );

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const jugador = interaction.user.username;

  try {
    const result = await pool.query(
      `SELECT * FROM juegos
       WHERE LOWER(titulo) = LOWER($1)
       AND jugador = $2
       LIMIT 1`,
      [titulo, jugador]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: `⚠️ No encontré ningún juego llamado **${titulo}** registrado por ti.`,
        ephemeral: true
      });
    }

    const juego = result.rows[0];
    const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    // Color dinámico según progreso
    const color =
      juego.progreso >= 80 ? 0x00ff7f : juego.progreso >= 50 ? 0xffd700 : 0xff4500;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎮 ${juego.titulo}`)
      .setDescription(
        `Información del juego registrado por **${juego.jugador}**`
      )
      .addFields(
        { name: '🕹️ Plataforma', value: juego.plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: juego.ambientacion || 'N/A', inline: true },
        { name: '📈 Progreso', value: `${juego.progreso}%`, inline: true },
        {
          name: '🕓 Última actualización',
          value: fecha,
          inline: true
        }
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Si tiene URL, la añadimos como enlace
    if (juego.retroarch_url)
      embed.addFields({
        name: '🔗 RetroArch',
        value: `[Abrir juego](${juego.retroarch_url})`
      });

    // Si hay notas
    if (juego.notas)
      embed.addFields({ name: '📝 Notas', value: juego.notas });

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /juego:', err);
    await interaction.reply({
      content: 'Hubo un error al obtener la información del juego.',
      ephemeral: true
    });
  }
}
