import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import QueueEmbedHandler from '../classes/QueueEmbedHandler';
import PlayerManager from '../classes/PlayerManager';
import { getMusicChannelMessage } from '../utils/utils';

export default {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Shows the queue.')
		.addIntegerOption((option) => option.setName('page').setDescription('Page number').setRequired(false))
		.setDMPermission(false),
	help: {
		name: 'Queue',
		description: 'Shows the queue.',
		arguments: '[page: number] - Page number *not required*',
		usage: '/queue `page:`2',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction
				.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true })
				.catch(() => {});
		const playerManager = PlayerManager.getInstance(member, main);
		if (!playerManager.current) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true }).catch(() => {});

		const page = interaction.options.getInteger('page') || 0;
		const queueHandler = new QueueEmbedHandler(playerManager, interaction, page);
		queueHandler.createEmbed();
	},
};
