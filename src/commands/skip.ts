import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import PlayerManager from '../classes/PlayerManager';
import { getMusicChannelMessage } from '../utils/utils';

export default {
	data: new SlashCommandBuilder().setName('skip').setDescription('Skips to the next song in queue.').setDMPermission(false),
	help: {
		name: 'Skip',
		description: 'Skips to the next song in queue.',
		arguments: '',
		usage: '/skip',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true });
		const playerManager = PlayerManager.getInstance(member);
		if (playerManager.isRepeated()) {
			playerManager.repeatPlay();
		}
		if (playerManager.queue.length === 0) {
			return interaction.reply({ content: 'There are no songs in queue.', ephemeral: true }).catch(console.error);
		}
		playerManager.play();
		return interaction.reply({ content: 'Skipped to the next song in queue.', ephemeral: true }).catch(console.error);
	},
};
