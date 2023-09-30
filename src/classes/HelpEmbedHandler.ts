import { ChatInputCommandInteraction, ComponentType, EmbedBuilder, InteractionResponse, StringSelectMenuInteraction } from 'discord.js';
import { Command } from '../interfaces';
import { createCommandHelpEmbed, createCommandOverviewEmbed, createMusicPlayerHelpEmbed } from '../utils/embeds';
import { getActionRow, select_components } from '../utils/components';

export default class HelpEmbedHandler {
	public interaction: ChatInputCommandInteraction;
	public commands: Command[];
	public currentEmbed: EmbedBuilder | null = null;
	constructor(interaction: ChatInputCommandInteraction, commands: Command[]) {
		this.interaction = interaction;
		this.commands = commands;
	}

	public async createEmbed(command?: string): Promise<void> {
		const options = ['Music Player', ...this.commands.map((c) => c.help.name)];
		const selectMenuComponents = getActionRow([select_components(options)]);
		if (command) {
			if (command === 'Music Player') {
				this.currentEmbed = createMusicPlayerHelpEmbed();
			} else {
				const help = this.commands.find((c) => c.help.name === command);
				if (!help) {
					this.interaction.reply({ content: 'Command not found!', ephemeral: true });
					return;
				}
				this.currentEmbed = createCommandHelpEmbed(help);
			}
		} else {
			this.currentEmbed = createCommandOverviewEmbed(this.commands);
		}
		const reply = await this.interaction.reply({ embeds: [this.currentEmbed], components: [selectMenuComponents] });

		this.listenForNavigation(reply);
	}

	public async listenForNavigation(reply: InteractionResponse): Promise<void> {
		const collector = reply.createMessageComponentCollector({
			filter: (i: StringSelectMenuInteraction) => i.user.id === this.interaction.user.id,
			componentType: ComponentType.StringSelect,
			time: 300000 /* 5 minutes */,
		});
		collector.on('collect', async (i: StringSelectMenuInteraction) => {
			const help = this.commands.find((c) => c.help.name === i.values[0]);

			if (!help) {
				this.currentEmbed = createMusicPlayerHelpEmbed();
			} else {
				this.currentEmbed = createCommandHelpEmbed(help);
			}

			await i.update({ embeds: [this.currentEmbed] });
		});
		// try {
		// 	const navigation = (await reply.awaitMessageComponent({
		// 		filter: (i) => i.user.id === this.interaction.user.id,
		// 		time: 300000,
		// 	})) as StringSelectMenuInteraction;
		// 	const help = this.commands.find((c) => c.help.name === navigation.values[0]);
		// 	if (!help) {
		// 		this.currentEmbed = createMusicPlayerHelpEmbed();
		// 	} else {
		// 		this.currentEmbed = createCommandHelpEmbed(help);
		// 	}

		// 	await navigation.update({ embeds: [this.currentEmbed], components: [selectMenuComponents] });
		// 	this.listenForNavigation(reply, selectMenuComponents);
		// } catch (error) {
		// 	this.interaction.editReply({ embeds: [this.currentEmbed!], components: [] });
		// }
	}
}
