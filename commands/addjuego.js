import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('addjuego')
  .setDescription('Añade un juego a la base global y vincúlalo a tu perfil.')
  .addStringOption(opt => opt.setName('titulo').setDescription('Título del juego').setRequired(true))
  .addIntegerOption(opt => opt.setName('anio').setDescription('Año de lanzamiento'))
  .addStringOption(opt => opt.setName('plataforma').setDescription('Plataforma principal'))
  .addStringOption(opt => opt.setName('ambientacion').setDescription('Ambientación o género'))
  .addStringOption(opt => opt.setName('retroarch_url').setDescription('URL del juego en RetroArch'))
  .addStringOption(opt => opt.setName('notas').setDescription('Notas adicionales'))
  .addStringOption(opt => opt.setName('imagen_url').setDescription('Imagen o portada del juego (opcional)'))
  .addStringOption(opt => opt.setName('ra_user').setDescription('Tu usuario en RetroAchievements (opcional)'));

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const anio = interaction.options.getInteger('anio');
  const plataforma = interaction.options.getString('plataforma');
  const ambientacion = interaction.options.getString('ambientacion');
  const retroarch_url = interaction.options.getString('retroarch_url');
  const notas = interaction.options.getString('notas');
  const imagen_url = interaction.options.getString('imagen_url');
  const ra_user = interaction.options.getString('ra_user');
  const jugador = interaction.user.username;

  try {
    // 1️⃣ Buscar si el juego ya existe en la base global
    let juego_id;
    const existingGame = await pool.query(`SELECT id FROM juegos WHERE LOWER(titulo) = LOWER($1)`, [titulo]);

    if (existingGame.rowCount === 0) {
      // Crear el juego global si no existe
      const insertGame = await pool.query(
        `INSERT INTO juegos (titulo, anio, plataforma, ambientacion, retroarch_url, imagen_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [titulo, anio, plataforma, ambientacion, retroarch_url, imagen_url]
      );
      juego_id = insertGame.rows[0].id;
    } else {
      juego_id = existingGame.rows[0].id;
    }

    // 2️⃣ Comprobar si el jugador ya tiene ese juego asociado
    const checkProgress = await pool.query(
      `SELECT * FROM progresos_usuario WHERE jugador = $1 AND juego_id = $2`,
      [jugador, juego_id]
    );

    if (checkProgress.rowCount > 0) {
      // 🟡 Ya existe → pedir confirmación para actualizar notas, RA o progreso
      const existing = checkProgress.rows[0];

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`⚠️ Ya tienes vinculado "${titulo}"`)
        .setDescription(
          `¿Quieres actualizar tus datos asociados a este juego?\n(Solo se modifican tus notas o tu cuenta RA)`
        )
        .addFields(
          { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
          { name: '📈 Progreso actual', value: `${existing.progreso ?? 0}%`, inline: true }
        )
        .setFooter({
          text: 'RetroTracker Bot • Confirmación de actualización',
          iconURL: interaction.user.displayAvatarURL(),
        });

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

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

      const collector = interaction.channel.createMessageComponentCollector({
        time: 15000,
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'No puedes responder a esta acción.', ephemeral: true });
        }

        if (i.customId === 'confirm_update') {
          await pool.query(
            `UPDATE progresos_usuario
             SET notas = $1, ra_user = $2, ultima_actualizacion = NOW()
             WHERE jugador = $3 AND juego_id = $4`,
            [notas, ra_user, jugador, juego_id]
          );

          const updatedEmbed = new EmbedBuilder()
            .setColor(0x00ff7f)
            .setTitle(`✅ Datos actualizados`)
            .setDescription(`Tu progreso o cuenta RA de **${titulo}** han sido actualizados.`)
            .setFooter({ text: 'RetroTracker Bot • NeonDB' })
            .setTimestamp();

          await i.update({ embeds: [updatedEmbed], components: [] });
          collector.stop();
        } else if (i.customId === 'cancel_update') {
          await i.update({
            content: '❌ Operación cancelada. No se modificó ningún dato.',
            embeds: [],
            components: [],
          });
          collector.stop();
        }
      });

      return;
    }

    // 3️⃣ Si no existe vínculo jugador-juego → crearlo
    await pool.query(
      `INSERT INTO progresos_usuario (jugador, juego_id, ra_user, notas)
       VALUES ($1, $2, $3, $4)`,
      [jugador, juego_id, ra_user, notas]
    );

    // 4️⃣ Mostrar confirmación visual
    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🎮 ${titulo}`)
      .setDescription(`Juego vinculado correctamente a **${jugador}**`)
      .addFields(
        { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: ambientacion || 'N/A', inline: true },
        { name: '📅 Año', value: anio ? anio.toString() : 'N/A', inline: true }
      )
      .setFooter({
        text: 'RetroTracker Bot • Base global',
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (retroarch_url)
      embed.addFields({
        name: '🔗 RetroArch',
        value: `[Abrir juego](${retroarch_url})`,
      });

    if (imagen_url) embed.setThumbnail(imagen_url);
    if (notas) embed.addFields({ name: '📝 Notas', value: notas });

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /addjuego:', err);
    await interaction.reply({
      content: 'Hubo un error al añadir o actualizar el juego.',
      ephemeral: true,
    });
  }
}
