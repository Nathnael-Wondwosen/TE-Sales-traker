import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

const THEME_PATH = path.join(process.cwd(), 'theme.json');

async function readTheme() {
  try {
    const buf = await fs.readFile(THEME_PATH, 'utf-8');
    return JSON.parse(buf);
  } catch {
    // defaults if file missing
    return {
      gradient: {
        from: '#ffffff',
        via: '#1e40af',
        to: '#0b1229',
        stop4: '#ffffff',
        direction: 'to right',
      },
      colors: {
        navText: '#0b1229',
        navTextHover: '#0a1a4a',
        headerTitle: '#ffffff',
        headerSubtitle: '#ffffff',
        tableHeaderText: '#6b7280',
      },
    };
  }
}

async function writeTheme(data: any) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(THEME_PATH, json, 'utf-8');
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const theme = await readTheme();
    return NextResponse.json({ success: true, data: theme });
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const theme = await readTheme();

    // Basic shape merge and validation
    const next = {
      gradient: {
        from: body?.gradient?.from ?? theme.gradient.from,
        via: body?.gradient?.via ?? theme.gradient.via,
        to: body?.gradient?.to ?? theme.gradient.to,
        stop4: body?.gradient?.stop4 ?? theme.gradient.stop4,
        direction: body?.gradient?.direction ?? theme.gradient.direction,
      },
      colors: {
        navText: body?.colors?.navText ?? theme.colors.navText,
        navTextHover: body?.colors?.navTextHover ?? theme.colors.navTextHover,
        headerTitle: body?.colors?.headerTitle ?? theme.colors.headerTitle,
        headerSubtitle: body?.colors?.headerSubtitle ?? theme.colors.headerSubtitle,
        tableHeaderText: body?.colors?.tableHeaderText ?? theme.colors.tableHeaderText,
      },
    };

    await writeTheme(next);
    return NextResponse.json({ success: true, data: next });
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
