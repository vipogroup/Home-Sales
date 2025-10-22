import jwt from 'jsonwebtoken';

export function agentAuth(req, res, next) {
  try {
    const token = req.cookies?.agent_token;
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== 'agent')
      return res.status(403).json({ success: false, error: 'Forbidden' });
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}

export function adminAuth(req, res, next) {
  try {
    // Disabled by default for dev; enable by setting ENABLE_ADMIN_AUTH=true
    if (process.env.ENABLE_ADMIN_AUTH !== 'true') return next();

    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Forbidden' });

    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}
