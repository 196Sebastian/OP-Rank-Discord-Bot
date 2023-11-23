const {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

const choices = [{ name: "Yes" }, { name: "No" }];

module.exports = {
  /**
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */

  run: async ({ interaction }) => {
    try {
      const targetUser = interaction.options.getUser("user");

      // later add logic to not be able to play with yourself

      if (targetUser.bot) {
        interaction.reply({
          content: "You cannot play with a bot.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("RANK")
        .setDescription("Rank Match Undergo")
        .setColor("Yellow")
        .setTimestamp(new Date());

      const buttons = choices.map((choice) => {
        return new ButtonBuilder()
          .setCustomId(choice.name)
          .setLabel(choice.name)
          .setStyle(ButtonStyle.Primary);
      });

      const row = new ActionRowBuilder().addComponents(buttons);

      const reply = await interaction.reply({
        content: `${targetUser}, you have been challenged. Do you accept?`,
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.log("Error with /lfg");
      console.log(error);
    }
  },

  data: {
    name: "rank",
    description: "Rank match with another users!",
    dm_permission: false,
    options: [
      {
        name: "user",
        description: "opponent",
        type: ApplicationCommandOptionType.User,
        require: true,
      },
    ],
  },
};
