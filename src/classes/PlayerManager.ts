import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	joinVoiceChannel,
	NoSubscriberBehavior,
	VoiceConnection,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { GuildMember, Message, VoiceBasedChannel } from 'discord.js';
import { createPlayer, createResourceStream } from '../utils/utils';
import { MediaTrack, PlayerState } from '../interfaces';
import PlayerEmbedHandler from './PlayerEmbedHandler';
import Main from './Main';
import SocketServer from './SocketServer';

export default class PlayerManager {
	public static instances: Map<string, PlayerManager> = new Map();
	public static getInstance(member: GuildMember, main: Main): PlayerManager {
		const guildId = member.guild.id;
		if (!PlayerManager.instances.has(guildId)) {
			PlayerManager.instances.set(guildId, new PlayerManager(main, guildId));
		}
		return PlayerManager.instances.get(guildId)!;
	}
	private socketServer: SocketServer | null;
	public main: Main;
	public guildId: string;
	public voiceChannel: VoiceBasedChannel | null = null;
	public playerEmbedHandler: PlayerEmbedHandler | null = null;
	public connection: VoiceConnection | null = null;
	public player: AudioPlayer | null = null;
	public audioResource: AudioResource | null = null;
	public state: PlayerState;
	public current: MediaTrack | null = null;
	public queue: MediaTrack[] = [];
	constructor(main: Main, guildId: string) {
		this.main = main;
		this.guildId = guildId;
		this.socketServer = main.socketServer;
		if (!main.config.volume.find((v) => v.guildId === guildId)) {
			this.setConfigVolume();
		}
		this.state = {
			connected: false,
			playing: false,
			paused: false,
			stopped: true,
			repeat: false,
			repeatAll: false,
			volume: main.config.volume.find((v) => v.guildId === guildId)?.volume || 30,
			idletime: 0,
		};
	}

	public destroyVoiceConnection(): void {
		if (this.player) {
			this.player.stop();
			this.player = null;
		}
		if (this.connection) {
			this.connection.destroy();
			this.connection = null;
		}
		this.voiceChannel = null;
		this.audioResource = null;
		this.current = null;
		this.queue = [];
		this.state = {
			connected: false,
			playing: false,
			paused: false,
			stopped: true,
			repeat: false,
			repeatAll: false,
			volume: this.main.config.volume.find((v) => v.guildId === this.guildId)?.volume || 30,
			idletime: 0,
		};
		if (this.socketServer) this.socketServer.io.to(this.guildId).emit('disconnected');
	}

	public createVoiceConnection(member: GuildMember, playerEmbed: false | Message): VoiceConnection {
		if (!this.connection) {
			this.voiceChannel = member.voice.channel!;
			this.connection = joinVoiceChannel({
				channelId: this.voiceChannel.id,
				guildId: this.voiceChannel.guild.id,
				adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
			});
			this.setConnected(true);
			this.player = createPlayer(NoSubscriberBehavior.Play);
			this.connection.subscribe(this.player);
			this.connection.on(VoiceConnectionStatus.Disconnected, () => {
				this.destroyVoiceConnection();
			});
			if (playerEmbed) {
				this.createPlayerEmbedHandler(playerEmbed);
			}
			this.player!.on('stateChange', (oldState, newState) => {
				if (newState.status === AudioPlayerStatus.Idle) {
					this.setPlaying(false);
					this.setPaused(false);
					this.setStopped(true);
					this.setIdletime(Date.now());
					if (this.isRepeatedAll()) return this.repeatAllPlay();
					if (this.isRepeated()) return this.repeatPlay();
					this.setRepeat(false);
					this.current = null;
					if (this.getQueue().length > 0) return this.play();
					if (this.playerEmbedHandler) this.playerEmbedHandler.basicEmbed();
					if (this.socketServer) this.socketServer.io.to(this.guildId).emit('idle', this.state);
				}
				if (newState.status === AudioPlayerStatus.Playing) {
					this.setPlaying(true);
					this.setPaused(false);
					this.setStopped(false);
					this.setIdletime(0);
					if (this.playerEmbedHandler)
						this.playerEmbedHandler.updateEmbed(this.current!, this.state, this.queue.length > 0 ? this.queue[0] : undefined);
					if (this.socketServer) this.socketServer.io.to(this.guildId).emit('playing', this.state, this.current!);
				}
				if (newState.status === AudioPlayerStatus.Paused) {
					this.setPlaying(false);
					this.setPaused(true);
					this.setIdletime(Date.now());
					if (this.playerEmbedHandler)
						this.playerEmbedHandler.updateEmbed(this.current!, this.state, this.queue.length > 0 ? this.queue[0] : undefined);
					if (this.socketServer) this.socketServer.io.to(this.guildId).emit('paused', this.state, this.current!);
				}
			});
			if (this.socketServer) this.socketServer.io.to(this.guildId).emit('connected', this.state);
		}
		return this.connection;
	}

	public createPlayerEmbedHandler(message: Message): void {
		if (this.playerEmbedHandler) return;
		this.playerEmbedHandler = new PlayerEmbedHandler(message);
	}

	//player methodes
	public async play(): Promise<void> {
		if (!this.player) return;
		const track = this.getNextTrack();
		if (!track) return;
		this.current = track;
		try {
			this.audioResource = await createResourceStream(track, this.state.volume);
		} catch (error) {
			console.error(error);
			console.log(track);
			return this.play();
		}

		this.player.play(this.audioResource);
	}

	public async repeatPlay(): Promise<void> {
		if (!this.player) return;
		const track = this.current!;
		try {
			this.audioResource = await createResourceStream(track, this.state.volume);
		} catch (error) {
			console.error(error);
			console.log(track);
			return;
		}

		this.player.play(this.audioResource);
	}

	public async repeatAllPlay(): Promise<void> {
		if (!this.player) return;
		const track = this.getNextTrack();
		if (!track) return;
		this.current = track;
		this.queue.push(track);
		try {
			this.audioResource = await createResourceStream(track, this.state.volume);
		} catch (error) {
			console.error(error);
			console.log(track);
			return;
		}

		this.player.play(this.audioResource);
	}

	public pause(): void {
		if (!this.player) return;
		if (!this.current) return;
		if (!this.isPaused()) {
			this.player.pause(true);
		} else {
			this.player.unpause();
		}
	}

	public stop(force: boolean): void {
		if (!this.player) return;
		this.setRepeat(false);
		this.queue = [];
		this.current = null;
		this.player.stop(true);
		if (force) this.destroyVoiceConnection();
	}

	public repeat(): void {
		if (!this.player) return;
		if (!this.current) return;
		if (this.isRepeated()) {
			this.setRepeat(false);
		} else {
			this.setRepeat(true);
			this.setRepeatAll(false);
		}
		if (this.playerEmbedHandler)
			this.playerEmbedHandler.updateEmbed(
				this.current,
				this.state,
				this.state.repeat ? this.current : this.queue.length > 0 ? this.queue[0] : undefined
			);
		if (this.socketServer) this.socketServer.io.to(this.guildId).emit('statechange', this.state, this.current);
	}

	public repeatAll(): void {
		if (!this.player) return;
		if (!this.current) return;
		if (this.isRepeatedAll()) {
			this.setRepeatAll(false);
		} else {
			this.setRepeatAll(true);
			this.setRepeat(false);
		}
		if (this.playerEmbedHandler)
			this.playerEmbedHandler.updateEmbed(this.current, this.state, this.queue.length > 0 ? this.queue[0] : this.current);
		if (this.socketServer) this.socketServer.io.to(this.guildId).emit('statechange', this.state, this.current);
	}

	public shuffle(): void {
		if (!this.player) return;
		if (!this.current) return;
		if (this.queue.length === 0) return;
		this.setIdletime(0);
		this.setPlaying(true);
		this.setPaused(false);
		this.setRepeat(false);
		this.setRepeatAll(false);
		let shuffle: MediaTrack[] = this.queue;
		shuffle.push(this.current);
		let currentIndex = shuffle.length,
			temporaryValue,
			randomIndex;

		while (0 !== currentIndex) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			temporaryValue = shuffle[currentIndex];
			shuffle[currentIndex] = shuffle[randomIndex];
			shuffle[randomIndex] = temporaryValue;
		}
		this.queue = shuffle;
		this.play();

		if (this.playerEmbedHandler)
			this.playerEmbedHandler.updateEmbed(this.current, this.state, this.queue.length > 0 ? this.queue[0] : undefined);
		if (this.socketServer) this.socketServer.io.to(this.guildId).emit('statechange', this.state, this.current);
	}

	public volume(number: number): void {
		const config = this.main.config;
		config.volume.find((v) => v.guildId === this.guildId)!.volume = number;
		this.main.setConfig(config);
		if (!this.audioResource) return;
		if (this.audioResource.volume) {
			this.audioResource.volume.setVolume(number / 100);
			this.setVolume(number);
		}
		if (this.playerEmbedHandler && this.state.playing)
			this.playerEmbedHandler.updateEmbed(this.current!, this.state, this.queue.length > 0 ? this.queue[0] : undefined);
		if (this.socketServer && this.state.playing) this.socketServer.io.to(this.guildId).emit('statechange', this.state, this.current!);
	}

	//queue methodes
	public addTrack(track: MediaTrack): void {
		this.queue.push(track);
	}

	public getNextTrack(): MediaTrack | undefined {
		return this.queue.shift();
	}

	public getQueue(): MediaTrack[] {
		return this.queue;
	}

	// getters for the state properties
	public getState(): PlayerState {
		return this.state;
	}

	public isConnected(): boolean {
		return this.state.connected;
	}

	public isPlaying(): boolean {
		return this.state.playing;
	}

	public isPaused(): boolean {
		return this.state.paused;
	}

	public isStopped(): boolean {
		return this.state.stopped;
	}

	public isRepeated(): boolean {
		return this.state.repeat;
	}

	public isRepeatedAll(): boolean {
		return this.state.repeatAll;
	}

	public getVolume(): number {
		return this.state.volume;
	}

	public getIdletime(): number {
		return this.state.idletime;
	}

	//setters for the state properties
	public setState(newState: PlayerState): void {
		this.state = newState;
	}

	public setConnected(connected: boolean): void {
		this.state.connected = connected;
	}

	public setPlaying(playing: boolean): void {
		this.state.playing = playing;
	}

	public setPaused(paused: boolean): void {
		this.state.paused = paused;
	}

	public setStopped(stopped: boolean): void {
		this.state.stopped = stopped;
	}

	public setRepeat(repeat: boolean): void {
		this.state.repeat = repeat;
	}

	public setRepeatAll(repeatAll: boolean): void {
		this.state.repeatAll = repeatAll;
	}

	public setVolume(volume: number): void {
		this.state.volume = volume;
	}

	public setIdletime(idletime: number): void {
		this.state.idletime = idletime;
	}

	public setConfigVolume(): void {
		const config = this.main.config;
		if (config.volume.find((v) => v.guildId === '0')) {
			config.volume.find((v) => v.guildId === '0')!.guildId = this.guildId;
			config.volume.find((v) => v.guildId === this.guildId)!.volume = 30;
		} else {
			config.volume.push({ guildId: this.guildId, volume: 30 });
		}
		this.main.setConfig(config);
	}
}
