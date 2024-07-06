/* This middleware is used to restrict access to certain API routes, that are used internally by Testausserveri's other systems */
/* Must be only used to avoid abuse use, not as a data protection measure */

export default function internalApiMiddleware(req, res, next) {
    res.setHeader('X-Testausapis-Internal-Api-Middleware', 'hit');
    if (process.env.INTERNAL_API_SECRET != req.get('X-Testausapis-Secret')) {
        res.status(403).json({error: "Unauthorized"}).end()
        return
    }
    next()
}