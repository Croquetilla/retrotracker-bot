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
    // 1️⃣ Buscar el juego global por título
    const juegoQuery = await pool.query(
      `SELECT id, titulo, plataforma, ambientacion, retroarch_url, imagen_url
       FROM juegos
       WHERE LOWER(titulo) = LOWER($1)
       LIMIT 1`,
      [titulo]
    );

    if (juegoQuery.rowCount === 0) {
      return interaction.reply({
        content: `⚠️ No encontré ningún juego llamado **${titulo}** en la base global.`,
        ephemeral: true
      });
    }

    const juego = juegoQuery.rows[0];

    // 2️⃣ Buscar el progreso del jugador específico
    const progresoQuery = await pool.query(
      `SELECT progreso, progreso_retroachievements, notas, ultima_actualizacion
       FROM progresos_usuario
       WHERE juego_id = $1 AND LOWER(jugador) = LOWER($2)
       LIMIT 1`,
      [juego.id, jugadorConsulta]
    );

    if (progresoQuery.rowCount === 0) {
      return interaction.reply({
        content: `📭 El jugador **${jugadorConsulta}** aún no tiene progreso registrado para **${titulo}**.`,
        ephemeral: true
      });
    }

    const progreso = progresoQuery.rows[0];
    const fecha = new Date(progreso.ultima_actualizacion).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    // 🎨 Color dinámico según progreso
    let color;
    if (progreso.progreso === null || isNaN(progreso.progreso)) {
      color = 0x808080; // gris si no hay progreso
    } else if (progreso.progreso >= 80) {
      color = 0x00ff7f; // verde
    } else if (progreso.progreso >= 50) {
      color = 0xffd700; // amarillo
    } else {
      color = 0xff4500; // rojo
    }

    // 🧱 Construir el embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎮 ${juego.titulo}`)
      .setDescription(`Información del juego y progreso de **${jugadorConsulta}**`)
      .addFields(
        { name: '🕹️ Plataforma', value: juego.plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: juego.ambientacion || 'N/A', inline: true },
        { name: '📈 Progreso', value: `${progreso.progreso ?? 0}%`, inline: true }
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    if (progreso.progreso_retroachievements !== null) {
      embed.addFields({
        name: '🏆 RetroAchievements',
        value: `${progreso.progreso_retroachievements}%`,
        inline: true
      });
    }

    embed.addFields({
      name: '🕓 Última actualización',
      value: fecha,
      inline: false
    });

    // 🔗 Añadir enlace RetroArch si existe
    if (juego.retroarch_url)
      embed.addFields({
        name: '🔗 RetroArch',
        value: `[Abrir juego](${juego.retroarch_url})`
      });

    // 📝 Añadir notas personales si existen
    if (progreso.notas)
      embed.addFields({ name: '📝 Notas', value: progreso.notas });

    // 🖼️ Añadir imagen si existe
    if (juego.imagen_url) {
      embed.setThumbnail(juego.imagen_url);
    }

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /juego:', err);
    await interaction.reply({
      content: 'Hubo un error al obtener la información del juego.',
      ephemeral: true
    });
  }
}
