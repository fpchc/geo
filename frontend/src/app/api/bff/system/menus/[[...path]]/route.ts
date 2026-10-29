import { proxyJsonRequest } from '@/lib/api/bff-proxy';

const ALLOWED_PATHS = [/^menus$/, /^menus\/\d+$/, /^menus\/tree\/all$/];

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function handle(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyJsonRequest(request, ['menus', ...path], ALLOWED_PATHS);
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
