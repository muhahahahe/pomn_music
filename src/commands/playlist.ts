import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import { getMusicChannelMessage } from '../utils/utils';
import PlaylistManager from '../classes/PlaylistManager';

export default {
	data: new SlashCommandBuilder()
		.setName('playlist')
		.setDescription('Manages playlists.')
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName('create')
				.setDescription('Creates a playlist.')
				.addStringOption((option) => option.setName('name').setDescription('Name of the playlist.').setRequired(true))
				.addStringOption((option) => option.setName('description').setDescription('Description of the playlist.'))
		)
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName('remove')
				.setDescription('Removes a playlist.')
				.addStringOption((option) => option.setName('name').setDescription('Name of the playlist.').setRequired(true))
		)
		.addSubcommand(new SlashCommandSubcommandBuilder().setName('list').setDescription('Lists all playlists.'))
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName('manage')
				.setDescription('Manages a playlist add tracks/removes tracks.')
				.addStringOption((option) => option.setName('name').setDescription('Name of the playlist.').setRequired(true))
		)
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName('play')
				.setDescription('Plays a playlist.')
				.addStringOption((option) => option.setName('name').setDescription('Name of the playlist.').setRequired(true))
		)
		.setDMPermission(false),
	help: {
		name: 'playlist',
		description:
			'Manages playlists\n\ncreate - creates a playlist\nremove - removes a playlist\nlist - lists all playlists\nmanage - add or remove tracks of a playlist',
		arguments: '[name] - the name of the playlist',
		usage: '/playlist create `<name>` `[description]`\n/playlist remove `<name>`\n/playlist list `<name>`\n/playlist manage `<name>`',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Execute this command in a different channel!', ephemeral: true }).catch(() => {});
		if (interaction.options.getSubcommand() === 'create') {
			const name = interaction.options.getString('name', true);
			const description = interaction.options.getString('description') || '';
			const playlistManager = new PlaylistManager(main, interaction);
			playlistManager.create(name, description);
		}

		if (interaction.options.getSubcommand() === 'remove') {
			const name = interaction.options.getString('name', true);
			const playlistManager = new PlaylistManager(main, interaction);
			playlistManager.remove(name);
		}

		if (interaction.options.getSubcommand() === 'list') {
			const playlistManager = new PlaylistManager(main, interaction);
			playlistManager.list();
		}

		if (interaction.options.getSubcommand() === 'manage') {
			const name = interaction.options.getString('name', true);
		}

		if (interaction.options.getSubcommand() === 'play') {
			const name = interaction.options.getString('name', true);
		}
	},
};
