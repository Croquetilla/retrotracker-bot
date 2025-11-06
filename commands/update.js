import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('update')
  .setDescription('Actualiza tu progreso personal de un juego.')
  .addStringOption(opt =>
    opt
      .setName('titulo')
      .setDescription('Título del juego')
      .setRequired(true)
  )
  .addIntegerOption(opt =>
    opt
      .setName('progreso')
      .setDescription('Porcentaje completado (0–100)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const titulo = interaction.options.getString('titulo');
  const progreso = interaction.options.getInteger('progreso');
  const jugador = interaction.user.username;

  try {
    // 1️⃣ Buscar el juego en la base global
    const juego = await pool.query(`SELECT id, plataforma, ambientacion, imagen_url FROM juegos WHERE LOWER(titulo) = LOWER($1)`, [titulo]);

    if (juego.rowCount === 0) {
      return interaction.reply({
        content: `⚠️ El juego **${titulo}** no existe en la base global. Usa **/addjuego** primero.`,
        ephemeral: true,
      });
    }

    const juego_id = juego.rows[0].id;

    // 2️⃣ Actualizar progreso del jugador
    const result = await pool.query(
      `UPDATE progresos_usuario
       SET progreso = $1, ultima_actualizacion = NOW()
       WHERE jugador = $2 AND juego_id = $3
       RETURNING progreso`,
      [progreso, jugador, juego_id]
    );

    if (result.rowCount === 0) {
      return interaction.reply({
        content: `⚠️ No tienes vinculado **${titulo}** a tu perfil. Usa /addjuego para añadirlo.`,
        ephemeral: true,
      });
    }

    // 3️⃣ Crear embed visual del progreso actualizado
    const embed = new EmbedBuilder()
      .setColor(progreso >= 80 ? 0x00ff7f : progreso >= 50 ? 0xffd700 : 0xff6347)
      .setTitle(`📈 Progreso actualizado`)
      .setDescription(`Has actualizado tu progreso en **${titulo}**`)
      .addFields(
        { name: '🎮 Progreso actual', value: `${progreso}%`, inline: true },
        { name: '🕹️ Plataforma', value: juego.rows[0].plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: juego.rows[0].ambientacion || 'N/A', inline: true }
      )
      .setFooter({ text: 'RetroTracker Bot • NeonDB', iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    if (juego.rows[0].imagen_url) embed.setThumbnail(juego.rows[0].imagen_url);

    // 4️⃣ Enviar mensaje al canal del progreso global (opcional)
    try {
      const progresoChannelId = process.env.PROGRESO_CHANNEL_ID;
      if (progresoChannelId) {
        const channel = await interaction.client.channels.fetch(progresoChannelId);
        if (channel) {
          await channel.send({
            content: `🏁 **${jugador}** ha actualizado su progreso en **${titulo}** → ${progreso}%`,
            embeds: [embed],
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo enviar mensaje al canal de progreso global:', e.message);
    }

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /update:', err);
    await interaction.reply({
      content: 'Hubo un error al actualizar el progreso.',
      ephemeral: true,
    });
  }
}
