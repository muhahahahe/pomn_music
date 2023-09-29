import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import PlayerManager from '../classes/PlayerManager';
import { getMusicChannelMessage, getPlayerManager } from '../utils/utils';

export default {
	data: new SlashCommandBuilder().setName('pause').setDescription('Pauses or unpauses the current track').setDMPermission(false),
	help: {
		name: 'Pause',
		description: 'Pauses or unpauses the current track',
		arguments: '-',
		usage: '/pause',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true });
		const playerManager = getPlayerManager(member, main, musicMessage);
		if (typeof playerManager === 'string') return interaction.reply({ content: playerManager, ephemeral: true });
		if (playerManager.isPaused() || playerManager.isPlaying()) {
			const state = playerManager.isPlaying() ? 'Paused playback' : 'Unpaused playback';
			playerManager.pause();

			return interaction.reply({ content: state });
		}

		return interaction.reply({ content: 'Nothing is playing', ephemeral: true });
	},
};
