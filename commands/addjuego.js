import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('addjuego')
  .setDescription('Añade un nuevo juego a tu registro o actualiza uno existente.')
  .addStringOption(opt =>
    opt
      .setName('titulo')
      .setDescription('Título del juego (debe coincidir con el listado de la hoja)')
      .setRequired(true)
  )
  .addIntegerOption(opt =>
    opt
      .setName('anio')
      .setDescription('Año de lanzamiento (opcional si está en la hoja)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('plataforma')
      .setDescription('Plataforma principal (SNES, PSX, etc.)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('ambientacion')
      .setDescription('Género o ambientación (acción, sci-fi, etc.)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('retroarch_url')
      .setDescription('URL del juego en RetroArch')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('notas')
      .setDescription('Notas personales o comentarios del jugador')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('imagen_url')
      .setDescription('Imagen o portada del juego (opcional)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt
      .setName('ra_user')
      .setDescription('Tu usuario en RetroAchievements')
      .setRequired(false)
  );
