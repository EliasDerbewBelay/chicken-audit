/** Owner can modify any record; employees only their own. */
function canModifyRecord(user, recordOwnerId) {
  if (!user || !recordOwnerId) return false;
  if (user.role === "owner") return true;
  return user.id === recordOwnerId;
}

module.exports = { canModifyRecord };
