import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const data = (await kv.get('poll_data')) || { votes: {}, ips: [] };
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        // Obtenemos la IP real a través de los headers que Vercel inyecta automáticamente
        const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'local-ip';
        const { player } = req.body;

        if (!player) {
            return res.status(400).json({ error: 'Jugador no especificado' });
        }

        let data = (await kv.get('poll_data')) || { votes: {}, ips: [] };

        // Validar si la IP ya votó
        if (data.ips.includes(ip)) {
            return res.status(403).json({ error: 'Ya participaste de esta encuesta.', data });
        }

        // Registrar voto y guardar IP
        data.ips.push(ip);
        data.votes[player] = (data.votes[player] || 0) + 1;

        // Guardar el nuevo estado en la base de datos
        await kv.set('poll_data', data);

        return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Método no permitido' });
}

