import Eris from "eris";
import { BCommand } from "../../structures/Command";
import { bot } from "../..";
import { changeAllNames } from "../../functions/changeAllNames";

export default new BCommand({
	name: "namerandom",
	description: "Change everyone's name to random words",
	type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT,

	run: async ({ interaction }) => {
		await interaction.defer();

		await changeAllNames(bot, interaction.guildID);

		interaction.createMessage("Changed all names!");
	},
});
