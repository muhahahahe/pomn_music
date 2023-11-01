import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import { getMusicChannelMessage, getPlayerManager } from '../utils/utils';

export default {
	data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffles the queue.').setDMPermission(false),
	help: {
		name: 'Shuffle',
		description: 'Shuffles the queue.',
		arguments: '',
		usage: '/shuffle',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction
				.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true })
				.catch(() => {});
		const playerManager = getPlayerManager(member, main, musicMessage);
		if (typeof playerManager === 'string') return interaction.reply({ content: playerManager, ephemeral: true }).catch(() => {});
		if (playerManager.queue.length === 0) {
			return interaction.reply({ content: 'There are no songs in queue.', ephemeral: main.config.silent_mode }).catch(() => {});
		}
		playerManager.shuffle();
		return interaction.reply({ content: 'Shuffled the queue.', ephemeral: main.config.silent_mode }).catch(() => {});
	},
};
