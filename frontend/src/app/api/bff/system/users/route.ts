import { proxyUsersRequest } from './proxy';

export async function GET(request: Request) {
  return proxyUsersRequest(request, '/users');
}

export async function POST(request: Request) {
  return proxyUsersRequest(request, '/users');
}
