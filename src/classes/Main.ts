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
import SocketServer from './SocketServer';
import PlaylistManager from './PlaylistManager';

export default class Main {
	public readonly commands: Command[] = getCommands();
	public config: Config = require('../data/config.json');
	public socketServer: SocketServer | null = null;
	public client: Client<true>;
	constructor(client: Client<true>) {
		this.client = client;
	}
	public async init(): Promise<void> {
		this.listenForCommands();
		this.listenForMusicChannel();
		this.listenForVoiceStateUpdate();
		this.regCommands();
		await this.client.user.setUsername(this.config.name).catch(() => {});
		await this.client.user.setAvatar(this.config.avatar).catch(() => {});
		console.log('Bot ready!');
		if (this.config.websocket.activated) {
			this.socketServer = new SocketServer(this.config.websocket, this);
		}
	}

	private regCommands(): void {
		if (this.config.reg_commands) return;
		let data = this.commands.map((c) => c.data.toJSON());
		if (!this.config.player_embed) {
			data = data.filter((c) => c.name !== 'setup');
		}
		if (!this.config.playlists) {
			data = data.filter((c) => c.name !== 'playlist');
		}
		if (!this.config.websocket.activated) {
			data = data.filter((c) => c.name !== 'socket');
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
			setTimeout(() => {
				message.delete().catch(() => {});
			}, 400);
			if (message.author.bot) return;
			const member = message.member;
			if (!member) return;
			const musicMessage = await getMusicChannelMessage(message.guildId!, this);
			const playerManager = getPlayerManager(member, this, musicMessage);
			if (typeof playerManager === 'string') return;
			//handle message commands
			const check = await checkURL(message.content);
			if (check === 'not resolvable') return;

			if (check === 'search') {
				if (message.content.startsWith('+')) {
					const search = message.content.slice(1);
					const track = await searchYoutube(search, member.user, member.voice.channel as VoiceChannel);
					if (typeof track === 'string') {
						if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(track);
						return;
					}
					playerManager.addTrack(track);
					if (playerManager.isStopped()) playerManager.play();
					else if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(`Added *${track.title}*`);
				}
				if (message.content.startsWith('v') || message.content.startsWith('vol') || message.content.startsWith('volume')) {
					let volume = Number(message.content.replace(/^\D+/g, '').trim());
					if (isNaN(volume)) return;
					if (volume < 0) volume = 1;
					if (volume > 100) volume = 100;
					playerManager.volume(volume);
				}
				if (message.content.startsWith('!')) {
					const name = message.content.replace('!', '').trim();
					const playlistManager = new PlaylistManager(this);
					playlistManager.playSocket(name, message.guildId!);
				}
			}

			if (check === 'youtube') {
				let url = message.content;
				if (!message.content.startsWith('https')) url = 'https://' + url;
				const track = await getYoutube(url, member.user, member.voice.channel as VoiceChannel);
				if (typeof track === 'string') {
					if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(track);
					return;
				}
				playerManager.addTrack(track);
				if (playerManager.isStopped()) playerManager.play();
				else if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(`Added *${track.title}*`);
			}

			if (check === 'youtube_playlist') {
				let url = message.content;
				if (!message.content.startsWith('https')) url = 'https://' + url;
				const tracks = await getYoutubePlaylist(url, member.user, member.voice.channel as VoiceChannel);
				if (typeof tracks === 'string') {
					if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(tracks);
					return;
				}
				tracks.forEach((track) => {
					playerManager.addTrack(track);
				});
				if (playerManager.isStopped()) playerManager.play();
				else if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(`Added *${tracks.length} tracks*`);
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
			const playerManager = getPlayerManager(member, this, musicMessage);
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

			if (resolvedReaction.reaction.emoji.name === '🔂') {
				playerManager.repeat();
			}

			if (resolvedReaction.reaction.emoji.name === '🔁') {
				playerManager.repeatAll();
			}

			if (resolvedReaction.reaction.emoji.name === '🔀') {
				playerManager.shuffle();
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
				const members = oldState.channel!.members.filter((m) => !m.user.bot);
				if (members.size === 0) {
					PlayerManager.getInstance(oldState.member!, this).destroyVoiceConnection();
				}
			}
		});
	}

	public setConfig(config: Config): void {
		this.config = config;
		writeConfig(config);
	}
}
