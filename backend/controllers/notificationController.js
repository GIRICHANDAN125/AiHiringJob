const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const getNotifications = async (req, res) => {
  const result = await query(
    `SELECT id, user_id, message, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );

  const unreadCount = result.rows.filter((item) => !item.is_read).length;

  res.json({
    success: true,
    notifications: result.rows,
    unreadCount,
  });
};

const markNotificationRead = async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = ? AND user_id = ?`,
    [id, req.user.id]
  );

  if (!result.affectedRows) {
    throw new AppError('Notification not found', 404);
  }

  const updated = await query(
    `SELECT id, user_id, message, is_read, created_at
     FROM notifications
     WHERE id = ? AND user_id = ?`,
    [id, req.user.id]
  );

  res.json({
    success: true,
    message: 'Notification marked as read',
    notification: updated.rows[0],
  });
};

module.exports = {
  getNotifications,
  markNotificationRead,
};
