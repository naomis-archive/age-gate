import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Colors,
  EmbedBuilder,
  GatewayIntentBits,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  WebhookClient,
} from "discord.js";
import { DateTime } from "luxon";

(async () => {
  const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
  const hook = new WebhookClient({ url: process.env.HOOK as string });

  bot.on("ready", async () => {
    console.log("ready!");

    const home =
      bot.guilds.cache.get(process.env.GUILD as string) ||
      (await bot.guilds.fetch(process.env.GUILD as string));

    if (!home) {
      console.log("home guild missing");
      process.exit(1);
    }

    const channel =
      home.channels.cache.get(process.env.CHANNEL as string) ||
      (await home.channels.fetch(process.env.CHANNEL as string));

    if (!channel || !("send" in channel)) {
      console.log("home channel missing");
      process.exit(1);
    }

    const button = new ButtonBuilder()
      .setCustomId("verify")
      .setLabel("Enter Your Age")
      .setEmoji("🔞")
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([button]);
    const embed = new EmbedBuilder()
      .setTitle("Age Verification")
      .setDescription(
        "This server is intended for members of 18 years in age or older. To gain access to this server, you'll need to provide your birthday through this system. Your birthday will be logged in a private logging channel in this server, for our own safety."
      );

    await channel.send({ embeds: [embed], components: [row] });
  });

  bot.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId === "verify") {
        const text = new TextInputBuilder()
          .setCustomId("birthday")
          .setLabel("What is your birthday in DD/MM/YYYY format?")
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph);
        const row = new ActionRowBuilder<TextInputBuilder>().addComponents([
          text,
        ]);
        const modal = new ModalBuilder().addComponents([row]);
        await interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      await interaction.deferReply({ ephemeral: true });
      const embed = new EmbedBuilder().setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      });
      const rawDate = interaction.fields.getTextInputValue("birthday");
      const age = DateTime.fromFormat(rawDate, "dd/MM/yyyy").diffNow(
        "years"
      ).years;
      if (age < 18) {
        embed.setTitle("Age Verification Failed");
        embed.setDescription(
          `Age verification failed: ${rawDate} (${age} years old)`
        );
        embed.setColor(Colors.DarkRed);
        await hook.send({});
        await interaction.reply({
          content: "You are not old enough to join this server.",
          ephemeral: true,
        });
        await (interaction.member as GuildMember).ban({
          reason: `Age verification failed: ${rawDate} (${age} years old)`,
        });
        return;
      }
      embed.setTitle("Age Verification Passed");
      embed.setDescription(
        `Age verification passed: ${rawDate} (${age} years old)`
      );
      embed.setColor(Colors.DarkGreen);
      const home =
        bot.guilds.cache.get(process.env.GUILD as string) ||
        (await bot.guilds.fetch(process.env.GUILD as string));

      if (!home) {
        console.log("home guild missing");
        process.exit(1);
      }

      const role =
        home.roles.cache.get(process.env.ROLE as string) ||
        (await home.roles.fetch(process.env.ROLE as string));

      if (!role) {
        console.log("home role missing");
        process.exit(1);
      }

      await (interaction.member as GuildMember).roles.add(role);
    }
  });

  await bot.login(process.env.TOKEN as string);
})();
