import { createClient } from 'redis';

let redisClient = null;

async function getRedisClient() {
    if (!redisClient) {
        // Vercel inyecta automáticamente REDIS_URL cuando conectás esa base de datos
        redisClient = createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', err => console.error('Redis Client Error', err));
        await redisClient.connect();
    }
    return redisClient;
}

export default async function handler(req, res) {
    try {
        const client = await getRedisClient();
        
        // Obtenemos la IP real a través de los headers que Vercel inyecta automáticamente
        const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'local-ip';
        
        if (req.method === 'GET') {
            const rawData = await client.get('poll_data');
            const data = rawData ? JSON.parse(rawData) : { votes: {}, ips: [] };

            // Devolvemos los votos actuales y si esta IP ya participó
            return res.status(200).json({
                votes: data.votes,
                yaVoto: data.ips.includes(ip)
            });
        }

        if (req.method === 'POST') {
            const { player } = req.body;

            if (!player) {
                return res.status(400).json({ error: 'Jugador no especificado' });
            }

            const rawData = await client.get('poll_data');
            let data = rawData ? JSON.parse(rawData) : { votes: {}, ips: [] };

            // Validar si la IP ya votó
            if (data.ips.includes(ip)) {
                return res.status(403).json({ error: 'Ya participaste de esta encuesta.', data });
            }

            // Registrar voto y guardar IP
            data.ips.push(ip);
            data.votes[player] = (data.votes[player] || 0) + 1;

            // Guardar el nuevo estado en la base de datos
            await client.set('poll_data', JSON.stringify(data));

            return res.status(200).json({ success: true, data });
        }

        return res.status(405).json({ error: 'Método no permitido' });
    } catch (error) {
        console.error("Error en API:", error);
        return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
}
