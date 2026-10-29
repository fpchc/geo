import { NextResponse } from 'next/server';
import { proxyUsersRequest } from '../proxy';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function resolveBackendPath(path: string[]): string | null {
  const joined = path.join('/');

  if (joined === 'roles') {
    return '/roles';
  }

  if (/^\d+$/.test(joined)) {
    return `/users/${joined}`;
  }

  if (/^\d+\/(password|roles)$/.test(joined)) {
    return `/users/${joined}`;
  }

  return null;
}

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const backendPath = resolveBackendPath(path);

  if (!backendPath) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  return proxyUsersRequest(request, backendPath);
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
