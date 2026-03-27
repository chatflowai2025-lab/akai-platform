import { NextRequest, NextResponse } from 'next/server';
import { getDripMessage } from '@/lib/cmo-campaign';
import { getAdminFirestore } from '@/lib/firebase-admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_CuqENxkM_AgFzKPSv3ZLgjqb3wLcZibXi';
const FROM_EMAIL = 'AKAI <welcome@aiclozr.com>';

// Aaron is always BCC'd on every drip email so he sees what goes out.
const OWNER_BCC = 'mrakersten@gmail.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Fetch user record from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data() ?? {};
    const userEmail: string | undefined = userData.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'User has no email address' }, { status: 422 });
    }

    // Calculate days since signup
    const createdAt: Date | undefined = userData.createdAt?.toDate
      ? userData.createdAt.toDate()
      : userData.createdAt
        ? new Date(userData.createdAt)
        : undefined;

    const daysSinceSignup = createdAt
      ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    const dripMessage = getDripMessage(daysSinceSignup);

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        bcc: [OWNER_BCC],
        subject: dripMessage.subject,
        text: dripMessage.body,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.json().catch(() => ({}));
      console.error('[cmo/drip] Resend error:', resendError);
      return NextResponse.json(
        { error: 'Failed to send email', details: resendError },
        { status: 502 }
      );
    }

    const resendData = await resendRes.json();

    return NextResponse.json({
      success: true,
      userId,
      daysSinceSignup,
      messageDay: dripMessage.day,
      module: dripMessage.module,
      subject: dripMessage.subject,
      emailId: resendData.id,
    });
  } catch (err: unknown) {
    console.error('[cmo/drip]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
