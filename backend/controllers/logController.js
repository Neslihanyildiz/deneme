const supabase = require('../config/supabase');

exports.getLogs = async (req, res) => {
    try {
        const { data: logs, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
        const { data: users } = await supabase
            .from('users')
            .select('id, username')
            .in('id', userIds);

        const userMap = Object.fromEntries((users || []).map(u => [u.id, u.username]));

        res.json(logs.map(log => ({
            id:        log.id,
            user_id:   log.user_id,
            username:  userMap[log.user_id] ?? 'Unknown',
            action:    log.action,
            details:   log.details,
            timestamp: log.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: 'Loglar getirilemedi.', details: error.message });
    }
};