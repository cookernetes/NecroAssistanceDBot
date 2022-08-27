import User from "../schemas/User";
import { BetterClient } from "../structures/Client";
import { randomArrItem, randomObjKey } from "./util";
import dictionary from "../data/dict.json";

export async function changeAllNames(bot: BetterClient, guildID: string) {
	let guildMembers = await bot.guilds.get(guildID).fetchMembers();

	guildMembers = guildMembers.filter((m) => !m.permissions.has("administrator"));

	for (const m of guildMembers) {
		const userFromDB = await User.findOne({ discordID: m.user.id });
		if (userFromDB && userFromDB.optOutNameChange !== null && userFromDB.optOutNameChange === true) continue;

		const randName = randomArrItem(dictionary).word.toLowerCase();

		await m.edit({
			nick: randName,
		});
	}
}
