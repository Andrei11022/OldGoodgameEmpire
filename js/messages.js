/**
 * FREE EMPIRE - Messages & Battle Reports
 * Inbox with tabs: Battle Reports, System, Construction, Player Messages
 */

export const MSG_TYPES = {
  BATTLE: 'battle',
  SYSTEM: 'system',
  CONSTRUCTION: 'construction',
  SCOUT: 'scout',
};

let _nextId = 1;

export function createMessage({ type, subject, body, data = {} }) {
  return {
    id: _nextId++,
    type,
    subject,
    body,
    data,
    timestamp: Date.now(),
    read: false,
  };
}

export function createBattleReport({ attacker, defender, attackerArmy, defenderStrength, result, casualties, loot, targetName }) {
  const won = result === 'victory';
  const subject = won ? `⚔️ Victory: ${targetName}` : `💀 Defeat: ${targetName}`;
  const lootStr = loot ? Object.entries(loot).map(([r, v]) => `+${v} ${r}`).join(', ') : 'None';
  const body = [
    `Result: ${won ? '🏆 Victory' : '☠️ Defeat'}`,
    `Enemy: ${targetName} (Strength ${defenderStrength})`,
    `Your Army: ${attackerArmy} soldiers`,
    `Casualties: ${casualties} soldiers lost`,
    `Loot: ${lootStr}`,
  ].join('\n');
  return createMessage({ type: MSG_TYPES.BATTLE, subject, body, data: { result, targetName, loot, casualties } });
}

export function createConstructionMessage(buildingName, level) {
  return createMessage({
    type: MSG_TYPES.CONSTRUCTION,
    subject: `🔨 ${buildingName} completed`,
    body: `Your ${buildingName}${level > 1 ? ` (Level ${level})` : ''} has finished construction.`,
    data: { buildingName, level },
  });
}

export function createSystemMessage(subject, body) {
  return createMessage({ type: MSG_TYPES.SYSTEM, subject, body });
}

export class MessageSystem {
  /**
   * Add a message to inbox, limit to last 100
   */
  static add(inbox, message) {
    if (!inbox) inbox = [];
    inbox.unshift(message);
    if (inbox.length > 100) inbox.length = 100;
    return inbox;
  }

  /**
   * Mark a message as read
   */
  static markRead(inbox, id) {
    const msg = inbox.find(m => m.id === id);
    if (msg) msg.read = true;
  }

  /**
   * Mark all as read
   */
  static markAllRead(inbox) {
    for (const msg of inbox) msg.read = true;
  }

  /**
   * Delete a message
   */
  static delete(inbox, id) {
    const idx = inbox.findIndex(m => m.id === id);
    if (idx !== -1) inbox.splice(idx, 1);
  }

  /**
   * Count unread messages
   */
  static unreadCount(inbox) {
    return inbox.filter(m => !m.read).length;
  }

  /**
   * Filter inbox by tab/type
   */
  static filter(inbox, type) {
    if (!type || type === 'all') return inbox;
    return inbox.filter(m => m.type === type);
  }
}
