import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { pool } from '../db.js';
import { getFullGameData } from '../integrations/merge.js'; // 👈 Integración con APIs externas

export const data = new SlashCommandBuilder()
  .setName('addjuego')
  .setDescription('Añade un juego a la base global y vincúlalo a tu perfil.')
  .addStringOption(opt => opt.setName('titulo').setDescription('Título del juego').setRequired(true))
  .addStringOption(opt => opt.setName('notas').setDescription('Notas personales o comentarios'));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const titulo = interaction.options.getString('titulo');
  const notas = interaction.options.getString('notas');
  const jugador = interaction.user.username;

  try {
    // 🧠 Obtener datos automáticos desde las APIs (IGDB + HLTB + RAWG)
    const data = await getFullGameData(titulo);

    let { anio, plataforma, genero, descripcion, duracion_horas, imagen_url, rating } = data;
    const ambientacion = genero;
    const autoCompleted = !!(anio || plataforma || genero || imagen_url);

    // 🗃️ Buscar o crear el juego global
    let juego_id;
    const existingGame = await pool.query(
      `SELECT id FROM juegos WHERE LOWER(titulo) = LOWER($1)`,
      [titulo]
    );

    if (existingGame.rowCount === 0) {
      const insertGame = await pool.query(
        `INSERT INTO juegos (titulo, anio, plataforma, ambientacion, imagen_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [titulo, anio, plataforma, ambientacion, imagen_url]
      );
      juego_id = insertGame.rows[0].id;
      console.log(`🆕 Juego creado: ${titulo}`);
    } else {
      juego_id = existingGame.rows[0].id;
      console.log(`ℹ️ Juego ya existente: ${titulo}`);
    }

    // 🧍‍♂️ Verificar si el jugador ya tiene ese juego
    const checkProgress = await pool.query(
      `SELECT * FROM progresos_usuario WHERE jugador = $1 AND juego_id = $2`,
      [jugador, juego_id]
    );

    if (checkProgress.rowCount > 0) {
      const existing = checkProgress.rows[0];
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`⚠️ Ya tienes vinculado "${titulo}"`)
        .setDescription('¿Quieres actualizar tus notas o detalles?')
        .addFields(
          { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
          { name: '📈 Progreso', value: `${existing.progreso ?? 0}%`, inline: true }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_update')
          .setLabel('✅ Actualizar')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_update')
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });

      const collector = interaction.channel.createMessageComponentCollector({ time: 15000 });
      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: 'No puedes responder a esta acción.', ephemeral: true });

        if (i.customId === 'confirm_update') {
          await pool.query(
            `UPDATE progresos_usuario
             SET notas = $1, ultima_actualizacion = NOW()
             WHERE jugador = $2 AND juego_id = $3`,
            [notas, jugador, juego_id]
          );
          await i.update({ content: `✅ Datos actualizados para ${titulo}`, embeds: [], components: [] });
          collector.stop();
        } else {
          await i.update({ content: '❌ Cancelado.', embeds: [], components: [] });
          collector.stop();
        }
      });
      return;
    }

    // 🆕 Crear nuevo vínculo jugador-juego
    await pool.query(
      `INSERT INTO progresos_usuario (jugador, juego_id, notas)
       VALUES ($1, $2, $3)`,
      [jugador, juego_id, notas]
    );

    // ✅ Crear embed de confirmación
    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🎮 ${titulo}`)
      .setDescription(descripcion ? descripcion.slice(0, 300) + '...' : 'Sin descripción disponible.')
      .addFields(
        { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
        { name: '🌍 Género', value: genero || 'N/A', inline: true },
        { name: '📅 Año', value: anio ? anio.toString() : 'N/A', inline: true }
      )
      .setFooter({ text: `RetroTracker Bot • ${autoCompleted ? 'Datos completados automáticamente' : 'Datos manuales'}` })
      .setTimestamp();

    if (duracion_horas)
      embed.addFields({ name: '⏱️ Duración estimada', value: `${duracion_horas}h`, inline: true });
    if (rating)
      embed.addFields({ name: '⭐ Valoración', value: rating.toFixed(1) + '/5', inline: true });
    if (imagen_url) embed.setThumbnail(imagen_url);
    if (notas) embed.addFields({ name: '📝 Notas del jugador', value: notas });

    await interaction.followUp({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error en /addjuego:', err);
    await interaction.followUp({
      content: 'Hubo un error al añadir o actualizar el juego.',
      ephemeral: true,
    });
  }
}
