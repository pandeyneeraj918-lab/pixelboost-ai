import Replicate from 'replicate';

export const runtime    = 'nodejs';
export const maxDuration = 30;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

/* POST /api/enhance  — start a prediction, return { id } immediately */
export async function POST(request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return Response.json(
      { error: 'REPLICATE_API_TOKEN is not set. See deployment instructions.' },
      { status: 500 }
    );
  }

  let image;
  try {
    ({ image } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!image) return Response.json({ error: 'No image provided.' }, { status: 400 });

  try {
    const prediction = await replicate.predictions.create({
      /* Real-ESRGAN — 4× upscaling with texture reconstruction */
      version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
      input: {
        image,
        scale: 4,
        face_enhance: false,
      },
    });

    return Response.json({ id: prediction.id, status: prediction.status });
  } catch (err) {
    console.error('[enhance/start]', err);
    return Response.json(
      { error: 'Could not start enhancement. Check your API token.' },
      { status: 500 }
    );
  }
}

/* GET /api/enhance?id=xxx  — poll prediction status */
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 });

  try {
    const prediction = await replicate.predictions.get(id);

    if (prediction.status === 'succeeded') {
      return Response.json({ status: 'succeeded', output: prediction.output });
    }
    if (prediction.status === 'failed') {
      return Response.json({ status: 'failed', error: prediction.error || 'Enhancement failed.' });
    }
    return Response.json({ status: prediction.status });
  } catch (err) {
    console.error('[enhance/poll]', err);
    return Response.json({ error: 'Failed to check status.' }, { status: 500 });
  }
}
