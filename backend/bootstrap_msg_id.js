/**
 * One-time bootstrap script.
 * Run: node bootstrap_msg_id.js <groupId> <messageId>
 *
 * Example:
 *   node bootstrap_msg_id.js -1001234567890 456
 *
 * How to find the messageId:
 *   Right-click the OLD report message in Telegram → Copy Message Link
 *   Link looks like: https://t.me/c/1234567890/456  ← 456 is the messageId
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('./src/models/Setting');

const [, , groupId, messageId] = process.argv;

if (!groupId || !messageId) {
    console.error('Usage: node bootstrap_msg_id.js <groupId> <messageId>');
    console.error('Example: node bootstrap_msg_id.js -1001234567890 456');
    process.exit(1);
}

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const key = `last_msg_id_${groupId}`;
    await Setting.findOneAndUpdate(
        { key },
        { value: String(messageId), updated_at: new Date() },
        { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Stored: key="${key}" → messageId="${messageId}"`);
    console.log('   The next report update will now delete that old message.');
    await mongoose.disconnect();
})();
