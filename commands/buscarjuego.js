import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('buscarjuego')
  .setDescription('Busca juegos por palabra clave en tus registros o los de otro jugador.')
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
    // 1️⃣ Buscar coincidencias en la base relacional
    const result = await pool.query(
      `SELECT j.titulo, j.plataforma, j.imagen_url, 
              p.progreso, p.progreso_retroachievements, p.ultima_actualizacion
       FROM progresos_usuario p
       JOIN juegos j ON j.id = p.juego_id
       WHERE LOWER(j.titulo) ILIKE LOWER($1)
       AND LOWER(p.jugador) = LOWER($2)
       ORDER BY p.ultima_actualizacion DESC
       LIMIT 10`,
      [`%${palabra}%`, jugadorConsulta]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: `📭 No encontré juegos que coincidan con “${palabra}” para **${jugadorConsulta}**.`,
        ephemeral: true
      });
    }

    // 2️⃣ Crear el embed de resultados
    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🔍 Resultados para “${palabra}”`)
      .setDescription(
        `Mostrando los ${result.rowCount} juegos más recientes de **${jugadorConsulta}**.`
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // 3️⃣ Añadir los juegos encontrados
    for (const juego of result.rows) {
      const fecha = new Date(juego.ultima_actualizacion).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      let progresoTexto = `📈 ${juego.progreso ?? 0}%`;
      if (juego.progreso_retroachievements !== null)
        progresoTexto += ` • 🏆 RA: ${juego.progreso_retroachievements}%`;

      embed.addFields({
        name: `🎮 ${juego.titulo}`,
        value: `${progresoTexto}\n🕹️ ${
          juego.plataforma ?? 'N/A'
        }\n🕓 ${fecha}`,
        inline: false
      });
    }

    // 4️⃣ Si solo hay un resultado con imagen, mostrarla como miniatura
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
