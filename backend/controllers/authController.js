const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { validatePassword } = require('../utils/passwordValidator');

// Cookie ayarları — tek yerden yönetmek için
const COOKIE_OPTIONS = {
    httpOnly: true,          // JS ile okunamaz (XSS koruması)
    secure: process.env.NODE_ENV === 'production', // Prod'da sadece HTTPS
    sameSite: 'strict',      // CSRF koruması
    maxAge: 8 * 60 * 60 * 1000, // 8 saat (ms cinsinden)
    path: '/',
};

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, password, publicKey, encryptedPrivateKey, keySalt } = req.body;

        // Password strength check
        const errors = validatePassword(password);
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Şifre güvenlik gereksinimlerini karşılamıyor.',
                requirements: errors
            });
        }

        // Duplicate username check
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        let newUser, insertError;
        ({ data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                username,
                password_hash,
                public_key:             publicKey,
                encrypted_private_key:  encryptedPrivateKey ?? null,
                key_salt:               keySalt ?? null,
            })
            .select('id, username')
            .single());

        if (insertError) {
            if (insertError.message.includes('encrypted_private_key') || insertError.message.includes('key_salt')) {
                ({ data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({ username, password_hash, public_key: publicKey })
                    .select('id, username')
                    .single());
            }
            if (insertError) throw insertError;
        }

        await supabase.from('activity_logs').insert({
            user_id: newUser.id,
            action: 'REGISTER',
            details: `${username} sisteme kayıt oldu.`,
            ip_address: req.ip
        });

        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', userId: newUser.id });
    } catch (error) {
        res.status(500).json({ error: 'Kayıt sırasında hata oluştu.', details: error.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        const role = user.role ?? 'user';

        const token = jwt.sign(
            { id: user.id, username: user.username, role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'LOGIN',
            details: `${username} sisteme giriş yaptı.`,
            ip_address: req.ip
        });

        // Token'ı httpOnly cookie olarak gönder — response body'de YOK
        res.cookie('token', token, COOKIE_OPTIONS);

        res.json({
            message: 'Giriş başarılı.',
            // token artık body'de yok, cookie'de
            encrypted_private_key: user.encrypted_private_key ?? null,
            key_salt:              user.key_salt ?? null,
            user: {
                id:         user.id,
                username:   user.username,
                public_key: user.public_key,
                role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
    }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
    // Cookie'yi sıfırla
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Çıkış başarılı.' });
};