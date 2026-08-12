import { NextResponse } from 'next/server';
import { PROCESSES } from '@/src/data/processesData';

export async function GET() {
  return NextResponse.json({ processes: PROCESSES });
}
