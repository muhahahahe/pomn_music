import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import { getMusicChannelMessage, getPlayerManager } from '../utils/utils';

export default {
	data: new SlashCommandBuilder().setName('repeatall').setDescription('Repeats all songs in queue.').setDMPermission(false),
	help: {
		name: 'RepeatAll',
		description: 'Repeats all songs in queue.',
		arguments: '',
		usage: '/repeatall',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true });
		const playerManager = getPlayerManager(member, main, musicMessage);
		if (typeof playerManager === 'string') return interaction.reply({ content: playerManager, ephemeral: true });
		if (!playerManager.current) return interaction.reply({ content: 'There is no song playing.', ephemeral: true });
		playerManager.repeatAll();
		return interaction.reply({ content: 'Repeating all songs in Queue', ephemeral: true });
	},
};
