const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Önce cookie'ye bak (yeni yöntem)
        // Sonra Authorization header'a bak (geriye dönük uyumluluk)
        const token = req.cookies?.token
            || (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.split(' ')[1]
                : null);

        if (!token) {
            return res.status(401).json({ error: 'Yetkilendirme başarısız. Token eksik.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username, role, iat, exp }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Yetkilendirme başarısız. Token geçersiz.' });
    }
};