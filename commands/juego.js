import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('juego')
  .setDescription('Muestra información detallada de un juego.')
  .addStringOption(opt =>
    opt
      .setName('titulo')
      .setDescription('Nombre del juego que quieres consultar')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('jugador')
      .setDescription('Nombre del jugador (opcional)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const jugadorConsulta =
    interaction.options.getString('jugador') || interaction.user.username;

  try {
    const result = await pool.query(
      `SELECT * FROM juegos
       WHERE LOWER(titulo) = LOWER($1)
       AND LOWER(jugador) = LOWER($2)
       LIMIT 1`,
      [titulo, jugadorConsulta]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: `⚠️ No encontré ningún juego llamado **${titulo}** registrado por **${jugadorConsulta}**.`,
        ephemeral: true
      });
    }

    const juego = result.rows[0];
    const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    // 🎨 Color dinámico según progreso
    let color;
    if (juego.progreso === null || isNaN(juego.progreso)) {
      color = 0x808080; // gris si no hay progreso
    } else if (juego.progreso >= 80) {
      color = 0x00ff7f; // verde
    } else if (juego.progreso >= 50) {
      color = 0xffd700; // amarillo
    } else {
      color = 0xff4500; // rojo
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎮 ${juego.titulo}`)
      .setDescription(
        `Información del juego registrado por **${juego.jugador}**`
      )
      .addFields(
        { name: '🕹️ Plataforma', value: juego.plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: juego.ambientacion || 'N/A', inline: true },
        { name: '📈 Progreso', value: `${juego.progreso ?? 0}%`, inline: true },
        { name: '🕓 Última actualización', value: fecha, inline: false }
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Añadir URL de RetroArch si existe
    if (juego.retroarch_url)
      embed.addFields({
        name: '🔗 RetroArch',
        value: `[Abrir juego](${juego.retroarch_url})`
      });

    // Añadir notas si existen
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
