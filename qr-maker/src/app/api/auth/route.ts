import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const CORRECT_PASSKEY = process.env.AUTH_PASSKEY || 'your-secure-passkey-here';

export async function POST(request: Request) {
  try {
    const { passkey } = await request.json();

    if (passkey !== CORRECT_PASSKEY) {
      return NextResponse.json(
        { error: 'Invalid passkey' },
        { status: 401 }
      );
    }

    // Set authentication cookie
    const cookieStore = cookies();
    (await cookieStore).set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}