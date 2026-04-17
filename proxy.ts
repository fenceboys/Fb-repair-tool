import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if exists
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Public routes - no auth required
  const publicRoutes = ['/login', '/auth/callback'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isCustomerPortal = pathname.startsWith('/customer/') || pathname.startsWith('/sign/');
  // API endpoints invoked from the customer portal. These MUST bypass the
  // auth redirect — customers have no session. If the proxy redirects them
  // to /login, the client's res.json() throws on the HTML response and
  // the modal shows a generic "Failed to initialize payment" error.
  const customerPortalApis = ['/api/create-payment-intent', '/api/client-error'];
  const isCustomerPortalApi = customerPortalApis.some(route => pathname.startsWith(route));

  // Allow public routes and customer portal
  if (isPublicRoute || isCustomerPortal || isCustomerPortalApi) {
    return response;
  }

  // Redirect to login if not authenticated
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Get user profile for role-based access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const role = profile?.role || 'salesperson';

  // Define admin-only routes
  const adminOnlyRoutes = ['/dashboard', '/quote/'];
  const isAdminRoute = adminOnlyRoutes.some(route => {
    if (route === '/quote/') {
      // /quote/[id]/edit is allowed for salesperson
      // /quote/[id] (intermediate), /quote/[id]/payments, /quote/[id]/notes are admin only
      const quoteMatch = pathname.match(/^\/quote\/[^/]+$/); // matches /quote/[id] exactly
      const paymentsMatch = pathname.includes('/payments');
      const notesMatch = pathname.includes('/notes');
      return quoteMatch || paymentsMatch || notesMatch;
    }
    return pathname.startsWith(route);
  });

  // Redirect salesperson away from admin routes
  if (role === 'salesperson' && isAdminRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, PDFs, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico)$).*)',
  ],
};
