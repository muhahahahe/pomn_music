import {
	APIActionRowComponent,
	APIButtonComponent,
	ActionRowBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { music_channel } from '../config.json';
import { confirm_components } from '../utils/components';

export default {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Sets up the bots music channel')
		.addChannelOption((option) =>
			option
				.setName('channel')
				.setDescription('The channel to setup, if empty current channel is used')
				.addChannelTypes(ChannelType.GuildText)
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	help: {
		name: 'Setup',
		description: 'Sets up the bots music channel',
		arguments: '[channel] - not required',
		usage: '/setup [channel]',
	},
	execute: async (interaction: ChatInputCommandInteraction) => {
		const channel = interaction.options.getChannel('channel') || interaction.channel;
		if (channel?.type !== ChannelType.GuildText) {
			return interaction.reply({
				content: 'Channel must be a guild text channel',
				ephemeral: true,
			});
		}

		if (music_channel !== '0') {
			const current_music_channel = interaction.guild?.channels.cache.get(music_channel);
			const confirm = new ActionRowBuilder().addComponents(confirm_components()).toJSON() as APIActionRowComponent<APIButtonComponent>;

			const reply = await interaction.reply({
				content: `The music channel is already set in ${current_music_channel}\n
                Do you want to change it to ${channel}?`,
				components: [confirm],
			});

			try {
				const confirmation = await reply.awaitMessageComponent({
					filter: (i) => i.user.id === interaction.user.id,
					time: 60000,
				});
				if (confirmation.customId === 'confirm') {
					//TODO: setup the channel
				} else if (confirmation.customId === 'cancel') {
					await confirmation.update({
						content: 'Setup cancelled',
						components: [],
					});
					setTimeout(() => {
						confirmation.deleteReply();
					}, 5000);
					return;
				}
			} catch (error) {
				return interaction.editReply({
					content: 'Confirmation not received within 1 minute, cancelling',
					components: [],
				});
			}
		}

		//TODO: setup the channel
	},
};
