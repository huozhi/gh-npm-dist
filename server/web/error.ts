export class DeprecationError extends Error {
  constructor({ page }: { page: string }) {
    super(`The middleware "${page}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return new Response("Hello " + request.url)
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `)
  }
}
