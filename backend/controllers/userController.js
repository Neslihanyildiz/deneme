const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

// GET /api/users/me
exports.getMe = async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, public_key, role, encrypted_private_key, key_salt')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Kullanıcı bilgisi alınırken hata oluştu.' });
    }
};

// PUT /api/users/change-password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, encryptedPrivateKey, keySalt } = req.body;

        if (!currentPassword || !newPassword || !encryptedPrivateKey || !keySalt) {
            return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Yeni şifre en az 8 karakter olmalıdır.' });
        }

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, username, password_hash')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newPasswordHash,
                encrypted_private_key: encryptedPrivateKey,
                key_salt: keySalt,
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        await supabase.from('activity_logs').insert({
            user_id: userId,
            action: 'PASSWORD_CHANGE',
            details: `${user.username} şifresini değiştirdi.`,
            ip_address: req.ip
        });

        res.json({ message: 'Şifre başarıyla güncellendi.' });

    } catch (error) {
        console.error('changePassword error:', error);
        res.status(500).json({ error: 'Şifre değiştirilirken hata oluştu.' });
    }
};