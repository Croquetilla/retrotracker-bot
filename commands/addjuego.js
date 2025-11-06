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
  .setDescription('Añade un nuevo juego al registro (o actualiza si ya existe).')
  .addStringOption(opt => opt.setName('titulo').setDescription('Título del juego').setRequired(true))
  .addIntegerOption(opt => opt.setName('anio').setDescription('Año de lanzamiento'))
  .addStringOption(opt => opt.setName('plataforma').setDescription('Plataforma principal'))
  .addStringOption(opt => opt.setName('ambientacion').setDescription('Ambientación o género'))
  .addStringOption(opt => opt.setName('retroarch_url').setDescription('URL del juego en RetroArch'))
  .addStringOption(opt => opt.setName('notas').setDescription('Notas adicionales'))
  .addStringOption(opt => opt.setName('imagen_url').setDescription('Imagen o portada del juego (opcional)'));

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const anio = interaction.options.getInteger('anio');
  const plataforma = interaction.options.getString('plataforma');
  const ambientacion = interaction.options.getString('ambientacion');
  const retroarch_url = interaction.options.getString('retroarch_url');
  const notas = interaction.options.getString('notas');
  const imagen_url = interaction.options.getString('imagen_url');
  const jugador = interaction.user.username;

  try {
    // Verificar si el juego ya existe para este jugador
    const check = await pool.query(
      `SELECT * FROM juegos WHERE LOWER(titulo) = LOWER($1) AND jugador = $2`,
      [titulo, jugador]
    );

    if (check.rowCount > 0) {
      // 🟡 Ya existe → preguntar si desea actualizarlo
      const existing = check.rows[0];

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`⚠️ El juego "${titulo}" ya existe`)
        .setDescription(
          `Ya tienes este juego registrado.\n\n¿Quieres actualizar la información existente?`
        )
        .addFields(
          { name: '🕹️ Plataforma actual', value: existing.plataforma || 'N/A', inline: true },
          { name: '📈 Progreso', value: `${existing.progreso ?? 0}%`, inline: true }
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

      // Crear un collector de botones que espera la respuesta
      const collector = interaction.channel.createMessageComponentCollector({
        time: 15000, // 15 segundos
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'No puedes responder a esta acción.', ephemeral: true });
        }

        if (i.customId === 'confirm_update') {
          await pool.query(
            `UPDATE juegos
             SET anio = $1, plataforma = $2, ambientacion = $3, retroarch_url = $4,
                 notas = $5, imagen_url = $6, ultima_actualizacion = NOW()
             WHERE LOWER(titulo) = LOWER($7) AND jugador = $8`,
            [anio, plataforma, ambientacion, retroarch_url, notas, imagen_url, titulo, jugador]
          );

          const updatedEmbed = new EmbedBuilder()
            .setColor(0x00ff7f)
            .setTitle(`✅ Juego actualizado`)
            .setDescription(`El juego **${titulo}** ha sido actualizado correctamente.`)
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

    // 🆕 Si no existe → insertar nuevo
    await pool.query(
      `INSERT INTO juegos (titulo, anio, plataforma, ambientacion, retroarch_url, jugador, notas, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [titulo, anio, plataforma, ambientacion, retroarch_url, jugador, notas, imagen_url]
    );

    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🎮 ${titulo}`)
      .setDescription(`Juego añadido correctamente por **${jugador}**`)
      .addFields(
        { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: ambientacion || 'N/A', inline: true },
        { name: '📅 Año de lanzamiento', value: anio ? anio.toString() : 'N/A', inline: true }
      )
      .setFooter({
        text: 'RetroTracker Bot • NeonDB',
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (retroarch_url)
      embed.addFields({
        name: '🔗 RetroArch',
        value: `[Abrir juego](${retroarch_url})`,
      });

    if (notas) embed.addFields({ name: '📝 Notas', value: notas });

    if (imagen_url) embed.setThumbnail(imagen_url);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /addjuego:', err);
    await interaction.reply({
      content: 'Hubo un error al añadir o actualizar el juego.',
      ephemeral: true,
    });
  }
}
