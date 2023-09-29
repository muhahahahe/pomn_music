import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	joinVoiceChannel,
	NoSubscriberBehavior,
	VoiceConnection,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { GuildMember, Message } from 'discord.js';
import { createPlayer, createResourceStream } from '../utils/utils';
import { MediaTrack, PlayerState } from '../interfaces';
import PlayerEmbedHandler from './PlayerEmbedHandler';

export default class PlayerManager {
	public static instances: Map<string, PlayerManager> = new Map();
	public static getInstance(member: GuildMember): PlayerManager {
		const guildId = member.guild.id;
		if (!PlayerManager.instances.has(guildId)) {
			PlayerManager.instances.set(guildId, new PlayerManager());
		}
		return PlayerManager.instances.get(guildId)!;
	}
	public playerEmbedHandler: PlayerEmbedHandler | null = null;
	public connection: VoiceConnection | null = null;
	public player: AudioPlayer | null = null;
	public audioResource: AudioResource | null = null;
	public state: PlayerState;
	public current: MediaTrack | null = null;
	public queue: MediaTrack[] = [];
	constructor() {
		this.state = {
			connected: false,
			playing: false,
			paused: false,
			stopped: true,
			repeat: false,
			volume: 50,
			idletime: 0,
		};
	}

	//connection methodes
	public destroyVoiceConnection(): void {
		if (this.player) {
			this.player.stop();
			this.player = null;
		}
		if (this.connection) {
			this.connection.destroy();
			this.connection = null;
		}
		this.audioResource = null;
		this.current = null;
		this.queue = [];
		this.state = {
			connected: false,
			playing: false,
			paused: false,
			stopped: true,
			repeat: false,
			volume: 50,
			idletime: 0,
		};
	}

	public createVoiceConnection(member: GuildMember, playerEmbed: false | Message): VoiceConnection {
		if (!this.connection) {
			const voiceChannel = member.voice.channel;
			this.connection = joinVoiceChannel({
				channelId: voiceChannel!.id,
				guildId: voiceChannel!.guild.id,
				adapterCreator: voiceChannel!.guild.voiceAdapterCreator,
			});
			this.setConnected(true);
			this.player = createPlayer(NoSubscriberBehavior.Play);
			this.connection.subscribe(this.player!);
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
					if (this.isRepeated()) return this.repeatPlay();
					this.setRepeat(false);
					this.current = null;
					if (this.getQueue().length > 0) this.play();
					if (this.playerEmbedHandler && !this.current) {
						this.playerEmbedHandler.basicEmbed();
					}
				}
				if (newState.status === AudioPlayerStatus.Playing) {
					this.setPlaying(true);
					this.setPaused(false);
					this.setStopped(false);
					this.setIdletime(0);
					if (this.playerEmbedHandler) {
						this.playerEmbedHandler.updateEmbed(this.current!, this.state);
					}
				}
				if (newState.status === AudioPlayerStatus.Paused) {
					this.setPlaying(false);
					this.setPaused(true);
					this.setStopped(false);
					this.setIdletime(Date.now());
					if (this.playerEmbedHandler) {
						this.playerEmbedHandler.updateEmbed(this.current!, this.state);
					}
				}
			});
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

	public pause(): void {
		if (!this.player) return;
		if (!this.current) return;
		if (!this.isPaused()) {
			this.player.pause(true);
		} else {
			this.player.unpause();
		}
		if (this.playerEmbedHandler) {
			this.playerEmbedHandler.updateEmbed(this.current, this.state);
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
		}
		if (this.playerEmbedHandler) {
			this.playerEmbedHandler.updateEmbed(this.current, this.state);
		}
	}

	public volume(number: number): void {
		if (!this.audioResource) return;
		if (this.audioResource.volume) {
			this.audioResource.volume.setVolume(number / 100);
			this.setVolume(number);
		}
		if (this.playerEmbedHandler && this.current) {
			this.playerEmbedHandler.updateEmbed(this.current, this.state);
		}
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

	public setVolume(volume: number): void {
		this.state.volume = volume;
	}

	public setIdletime(idletime: number): void {
		this.state.idletime = idletime;
	}
}