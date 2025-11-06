import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { pool } from '../db.js';

const SHEET_URL = process.env.SHEET_URL;

// 🧠 Lee el CSV de Google Sheets y lo convierte en objetos
async function getSheetData() {
  if (!SHEET_URL) return [];
  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const rows = text.split('\n').map(r => r.split(','));
    const headers = rows.shift().map(h => h.trim().toLowerCase());
    return rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (r[i] || '').trim()));
      return obj;
    });
  } catch (e) {
    console.error('❌ Error leyendo la hoja:', e);
    return [];
  }
}

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
  let titulo = interaction.options.getString('titulo');
  let anio = interaction.options.getInteger('anio');
  let plataforma = interaction.options.getString('plataforma');
  let ambientacion = interaction.options.getString('ambientacion');
  let retroarch_url = interaction.options.getString('retroarch_url');
  const notas = interaction.options.getString('notas');
  let imagen_url = interaction.options.getString('imagen_url');
  const ra_user = interaction.options.getString('ra_user');
  const jugador = interaction.user.username;

  try {
    // 🧾 Buscar en la hoja de cálculo
    const sheet = await getSheetData();
    const match = sheet.find(row =>
      (row.título || row.titulo || '').toLowerCase() === titulo.toLowerCase()
    );

    let autoCompleted = false;

    if (match) {
      // Si hay coincidencia, rellenamos automáticamente los campos vacíos
      const getVal = keys => keys.map(k => match[k]).find(v => v) || null;

      anio = anio ?? parseInt(getVal(['año', 'anio'])) || null;
      plataforma = plataforma ?? getVal(['plataforma', 'consola', 'sistema']);
      ambientacion = ambientacion ?? getVal(['ambientacion', 'género', 'genero']);
      retroarch_url = retroarch_url ?? getVal(['retroarch_url', 'retroarchurl', 'url']);
      imagen_url = imagen_url ?? getVal(['imagen', 'imagen_url', 'portada']);
      autoCompleted = true;
    }

    // 🗃️ Buscar o crear el juego global
    let juego_id;
    const existingGame = await pool.query(
      `SELECT id FROM juegos WHERE LOWER(titulo) = LOWER($1)`,
      [titulo]
    );

    if (existingGame.rowCount === 0) {
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
        .setDescription('¿Quieres actualizar tus notas o tu usuario RA?')
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

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

      const collector = interaction.channel.createMessageComponentCollector({ time: 15000 });
      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: 'No puedes responder a esta acción.', ephemeral: true });

        if (i.customId === 'confirm_update') {
          await pool.query(
            `UPDATE progresos_usuario
             SET notas = $1, ra_user = $2, ultima_actualizacion = NOW()
             WHERE jugador = $3 AND juego_id = $4`,
            [notas, ra_user, jugador, juego_id]
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

    // 🆕 Crear nuevo vínculo
    await pool.query(
      `INSERT INTO progresos_usuario (jugador, juego_id, ra_user, notas)
       VALUES ($1, $2, $3, $4)`,
      [jugador, juego_id, ra_user, notas]
    );

    // ✅ Embed de confirmación
    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle(`🎮 ${titulo}`)
      .setDescription(`Juego vinculado correctamente a **${jugador}**`)
      .addFields(
        { name: '🕹️ Plataforma', value: plataforma || 'N/A', inline: true },
        { name: '🌍 Ambientación', value: ambientacion || 'N/A', inline: true },
        { name: '📅 Año', value: anio ? anio.toString() : 'N/A', inline: true }
      )
      .setFooter({ text: 'RetroTracker Bot • Base global' })
      .setTimestamp();

    if (retroarch_url)
      embed.addFields({ name: '🔗 RetroArch', value: `[Abrir juego](${retroarch_url})` });
    if (imagen_url) embed.setThumbnail(imagen_url);
    if (notas) embed.addFields({ name: '📝 Notas', value: notas });
    if (autoCompleted)
      embed.addFields({
        name: '📋 Datos completados automáticamente',
        value: 'Los datos del juego se han rellenado desde la hoja de Google Sheets.',
      });

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error en /addjuego:', err);
    await interaction.reply({
      content: 'Hubo un error al añadir o actualizar el juego.',
      ephemeral: true,
    });
  }
}
