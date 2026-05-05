import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

const FILE = './data/autoreplies.json';

function load() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export default {
  data: new SlashCommandBuilder()
    .setName('autoreply')
    .setDescription('auto reply system')

    .addSubcommand(s =>
      s.setName('add')
        .addStringOption(o => o.setName('word').setRequired(true))
        .addStringOption(o => o.setName('reply').setRequired(true))
    )

    .addSubcommand(s =>
      s.setName('remove')
        .addStringOption(o => o.setName('word').setRequired(true))
    )

    .addSubcommand(s =>
      s.setName('list')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const data = load();

    if (sub === 'add') {
      const word = interaction.options.getString('word');
      const reply = interaction.options.getString('reply');

      data[word] = reply;
      save(data);

      return interaction.reply('تم الحفظ ✅');
    }

    if (sub === 'remove') {
      const word = interaction.options.getString('word');

      delete data[word];
      save(data);

      return interaction.reply('تم الحذف 🗑️');
    }

    if (sub === 'list') {
      const keys = Object.keys(data);

      if (!keys.length) return interaction.reply('مافي شي');

      return interaction.reply(
        keys.map(k => `${k} → ${data[k]}`).join('\n')
      );
    }
  }
};
