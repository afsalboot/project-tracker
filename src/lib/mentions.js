import User from "@/models/User";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsMention(body, value) {
  if (!value) return false;
  return new RegExp(`(^|\\s)@${escapeRegex(value)}(?=$|[\\s,.:;!?])`, "i").test(body);
}

export async function resolveMentionedUserIds(workspaceId, body, authorId) {
  const members = await User.find({ workspaceId, status: { $ne: "suspended" } }).select("name username email").lean();
  const firstNameCounts = new Map();
  for (const member of members) {
    const firstName = member.name.trim().split(/\s+/)[0].toLowerCase();
    firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
  }
  return members.filter((member) => {
    if (String(member._id) === String(authorId)) return false;
    const name = member.name.trim();
    const firstName = name.split(/\s+/)[0];
    const aliases = [member.username, member.email, name, name.replace(/\s+/g, "."), name.replace(/\s+/g, "")];
    if (firstNameCounts.get(firstName.toLowerCase()) === 1) aliases.push(firstName);
    return aliases.some((alias) => containsMention(body, alias));
  }).map((member) => member._id);
}
