import { BaseGuildTextChannel, ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { confirm_components, getActionRow } from '../utils/components';
import Main from '../classes/Main';
import { addReaction, deleteMessage, getMusicChannelMessage, removeMusicChannelConfig, updateMusicChannelConfig } from '../utils/utils';
import { createBasicPlayerEmbed } from '../utils/embeds';

const emojis = ['🎶', '⏯️', '⏭️', '⏹️', '🔁', '⏏️'];
export default {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Creates or removes the bots music channel!')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Creates the bots music channel')
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('The channel to setup, if empty current channel is used')
						.addChannelTypes(ChannelType.GuildText)
				)
		)
		.addSubcommand((subcommand) => subcommand.setName('remove').setDescription('Removes the bots music channel'))
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	help: {
		name: 'Setup',
		description: 'Creates or removes the bots music channel',
		arguments: '[channel] - *not required*',
		usage: '/setup create [channel]\n/setup remove',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		if (!main.config.player_embed) return interaction.reply({ content: 'The music player embed is disabled', ephemeral: true });

		if (interaction.options.getSubcommand() === 'create') {
			const channel = interaction.options.getChannel('channel') || interaction.channel;
			if (channel instanceof BaseGuildTextChannel) {
			} else {
				return interaction.reply({ content: 'Channel must be a guild text channel', ephemeral: true });
			}

			await interaction.deferReply();
			const current_music_message = await getMusicChannelMessage(interaction.guildId!, main);
			if (current_music_message) {
				const confirm = getActionRow(confirm_components());
				const reply = await interaction.editReply({
					content: `The music channel is already set in ${current_music_message.channel}\n
					Do you want to change it to ${channel}?`,
					components: [confirm],
				});

				try {
					const confirmation = await reply.awaitMessageComponent({
						filter: (i) => i.user.id === interaction.user.id,
						time: 60000,
					});
					if (confirmation.customId === 'confirm') {
						deleteMessage(current_music_message);
					} else if (confirmation.customId === 'cancel') {
						await confirmation.update({ content: 'Setup cancelled', components: [] });
						setTimeout(() => {
							confirmation.deleteReply().catch(console.error);
						}, 5000);
						return;
					}
				} catch (error) {
					interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
					setTimeout(() => {
						interaction.deleteReply().catch(console.error);
					}, 5000);
				}
			}
			try {
				const embed = createBasicPlayerEmbed();
				const message = await channel.send({ embeds: [embed] });
				addReaction(message, emojis);
				const new_music_channel = {
					guildId: interaction.guildId!,
					channelId: channel.id,
					messageId: message.id,
				};
				const config = updateMusicChannelConfig(new_music_channel, current_music_message ? true : false);
				if (!config) return interaction.editReply({ content: 'reading config failed' });
				main.setConfig(config);
			} catch (error) {
				console.error(error);
				return interaction.editReply({ content: 'Creating the player failed!' });
			}

			interaction.editReply({ content: 'Setup complete!' });
			setTimeout(() => {
				interaction.deleteReply().catch(console.error);
			}, 5000);
		} else {
			const current_music_message = await getMusicChannelMessage(interaction.guildId!, main);
			if (!current_music_message) {
				return interaction.reply({ content: 'The music channel is not set', ephemeral: true });
			}
			await interaction.deferReply();
			const confirm = getActionRow(confirm_components());
			const reply = await interaction.editReply({
				content: `Do you want to remove the music player?`,
				components: [confirm],
			});

			try {
				const confirmation = await reply.awaitMessageComponent({
					filter: (i) => i.user.id === interaction.user.id,
					time: 60000,
				});
				if (confirmation.customId === 'confirm') {
					deleteMessage(current_music_message);
				} else if (confirmation.customId === 'cancel') {
					await confirmation.update({ content: 'Setup cancelled', components: [] });
					setTimeout(() => {
						confirmation.deleteReply().catch(console.error);
					}, 5000);

					return;
				}
			} catch (error) {
				interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
				setTimeout(() => {
					interaction.deleteReply().catch(console.error);
				}, 5000);
			}

			try {
				const config = removeMusicChannelConfig(interaction.guildId!);

				if (!config) return interaction.editReply({ content: 'reading config failed' });

				main.setConfig(config);
			} catch (error) {
				console.error(error);

				return interaction.editReply({ content: 'Removing the player failed!' });
			}

			interaction.editReply({ content: 'Removing complete!' });
			setTimeout(() => {
				interaction.deleteReply().catch(console.error);
			}, 5000);
		}
		return;
	},
};
