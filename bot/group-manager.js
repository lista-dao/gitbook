class GroupManager {
  constructor(botInfo) {
    this.botInfo = botInfo;
  }

  // 检查是否为允许的聊天（白名单功能）
  isAllowedChat(chatId, chatType) {
    if (chatType === "private") {
      return false;
    }

    // 如果没有设置群组白名单，默认允许所有群组
    const allowedGroupIds = process.env.ALLOWED_GROUP_IDS;
    if (!allowedGroupIds) {
      return true;
    }

    // 检查群组ID是否在白名单中
    const allowedIds = allowedGroupIds.split(",").map((id) => id.trim());
    return allowedIds.includes(chatId.toString());
  }

  // 检查是否应该响应消息（群组@功能）
  shouldRespondToMessage(ctx) {
    const chatType = ctx.chat.type;

    // 私聊总是响应
    if (chatType === "private") {
      return true;
    }

    // 群组中检查是否被@
    const text = ctx.message.text;
    const botUsername = this.botInfo?.username;

    // 方法1: 检查是否@了具体的bot用户名（支持任意位置的@）
    if (botUsername) {
      return (
        text.includes(`@${botUsername}`) ||
        ctx.message.reply_to_message?.from?.id === this.botInfo.id
      );
    }

    // 方法2: 检查是否回复了bot的消息
    if (ctx.message.reply_to_message?.from?.id === this.botInfo.id) {
      return true;
    }

    return false;
  }

  // 清理问题文本（移除@mentions）
  cleanQuestion(question) {
    if (!question) return "";

    return question
      .replace(/@[\w_]+/g, "") // 移除所有@mentions（包括下划线）
      .replace(/^\s*\/\w+/, "") // 移除命令（如/start）
      .trim()
      .replace(/\s+/g, " "); // 规范化空格
  }
}

module.exports = GroupManager;
