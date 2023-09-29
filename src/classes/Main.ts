import { Client, VoiceChannel } from 'discord.js';
import {
	checkURL,
	getCommands,
	getMediaFile,
	getMusicChannelMessage,
	getPlayerManager,
	getYoutube,
	getYoutubePlaylist,
	registerCommands,
	resolveReactionPartials,
	searchYoutube,
	writeConfig,
} from '../utils/utils';
import { Command, Config } from '../interfaces';
import PlayerManager from './PlayerManager';

export default class Main {
	public readonly commands: Command[] = getCommands();
	public config: Config = require('../config.json');
	public client: Client;
	constructor(client: Client) {
		this.client = client;
	}
	public init(): void {
		this.listenForCommands();
		this.listenForMusicChannel();
		this.listenForVoiceStateUpdate();
		this.regCommands();
	}

	private regCommands(): void {
		if (this.config.reg_commands) return;
		let data = this.commands.map((c) => c.data.toJSON());
		if (!this.config.player_embed) {
			data = data.filter((c) => c.name !== 'setup');
		}
		registerCommands(this.client.user!.id, data);
	}

	private listenForCommands(): void {
		this.client.on('interactionCreate', async (interaction) => {
			if (!interaction.isCommand()) return;

			const command = this.commands.find((c) => c.data.name === interaction.commandName);
			if (!command) return;

			try {
				command.execute(interaction, this);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		});
	}

	private listenForMusicChannel(): void {
		if (!this.config.player_embed) return;
		this.client.on('messageCreate', async (message) => {
			const channels = this.config.music_channels.map((guild: { channelId: string }) => guild.channelId);
			if (!channels.includes(message.channelId)) return;
			message.delete().catch(() => {});
			if (message.author.bot) return;
			const member = message.member;
			if (!member) return;
			const musicMessage = await getMusicChannelMessage(message.guildId!, this);
			const playerManager = getPlayerManager(member, musicMessage);
			if (typeof playerManager === 'string') return;
			//handle message commands
			const check = await checkURL(message.content);
			if (check === 'not resolvable') return;

			if (check === 'search') {
				if (message.content.startsWith('+')) {
					const search = message.content.slice(1);
					const track = await searchYoutube(search, member.user, member.voice.channel as VoiceChannel);
					playerManager.addTrack(track);
					if (playerManager.isStopped()) playerManager.play();
				}
				if (message.content.startsWith('v') || message.content.startsWith('vol') || message.content.startsWith('volume')) {
					const volume = Number(message.content.replace(/^\D+/g, '').trim());
					if (isNaN(volume)) return;
					playerManager.volume(volume);
				}
			}

			if (check === 'youtube') {
				let url = message.content;
				if (!message.content.startsWith('https')) url = 'https://' + url;
				const track = await getYoutube(url, member.user, member.voice.channel as VoiceChannel);
				if (!track) return;
				playerManager.addTrack(track);
				if (playerManager.isStopped()) playerManager.play();
			}

			if (check === 'youtube_playlist') {
				let url = message.content;
				if (!message.content.startsWith('https')) url = 'https://' + url;
				const tracks = await getYoutubePlaylist(url, member.user, member.voice.channel as VoiceChannel);
				if (typeof tracks === 'string') return;
				tracks.forEach((track) => {
					playerManager.addTrack(track);
				});
				if (playerManager.isStopped()) playerManager.play();
			}

			if (check === 'media') {
				const track = await getMediaFile(message.content, member.user, member.voice.channel as VoiceChannel);
				playerManager.addTrack(track);
				if (playerManager.isStopped()) playerManager.play();
			}
		});
		this.client.on('messageReactionAdd', async (reaction, user) => {
			// If the reaction is a partial, fetch it to get the complete reaction
			const resolvedReaction = await resolveReactionPartials(reaction, user);
			if (!resolvedReaction) return;
			if (resolvedReaction.user.bot) return;
			const channels = this.config.music_channels.map((guild: { channelId: string }) => guild.channelId);
			if (!channels.includes(resolvedReaction.reaction.message.channelId)) return;
			resolvedReaction.reaction.users.remove(resolvedReaction.user.id);
			const member = reaction.message.guild!.members.cache.get(resolvedReaction.user.id);
			if (!member) return;
			const musicMessage = await getMusicChannelMessage(resolvedReaction.reaction.message.guildId!, this);
			const playerManager = getPlayerManager(member, musicMessage);
			if (typeof playerManager === 'string') return;
			//handle reaction commands
			if (resolvedReaction.reaction.emoji.name === '⏯️') {
				playerManager.pause();
			}

			if (resolvedReaction.reaction.emoji.name === '⏭️') {
				playerManager.play();
			}

			if (resolvedReaction.reaction.emoji.name === '⏹️') {
				playerManager.stop(false);
			}

			if (resolvedReaction.reaction.emoji.name === '🔁') {
				playerManager.repeat();
			}

			if (resolvedReaction.reaction.emoji.name === '⏏️') {
				playerManager.stop(true);
			}

			if (resolvedReaction.reaction.emoji.name === '🎶') {
				resolvedReaction.user.send({ content: playerManager.current?.url }).catch(() => {});
			}
		});
	}

	private listenForVoiceStateUpdate(): void {
		this.client.on('voiceStateUpdate', (oldState, newState) => {
			if (oldState.channelId === newState.channelId) return;
			if (newState.member?.user.bot) return;
			if (oldState.channelId) {
				//handle leave
				//get all users in the vc besides the bot
				const members = oldState.channel!.members.filter((m) => !m.user.bot);
				if (members.size === 0) {
					PlayerManager.getInstance(oldState.member!).destroyVoiceConnection();
				}
			}
			if (newState.channelId) {
				//handle join
			}
		});
	}

	public setConfig(config: Config): void {
		this.config = config;
		writeConfig(config);
	}
}
