import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('connect.sid');

  if (!sessionCookie) {
    redirect('/login');
  }

  // Optionally, you can also fetch the `/api/auth/me` endpoint from the server side here
  // to ensure the session is not just present but actually valid, but checking the cookie
  // presence handles the baseline requirement. We'll simulate fetching for completeness:
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, { credentials: 'include',  headers: {
        Cookie: `connect.sid=${sessionCookie.value}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      redirect('/login');
    }
  } catch (err) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to the protected dashboard area.</p>
      <form action={async () => {
        'use server';
        // Server action to clear cookie and redirect
        const cookieStore = await cookies();
        cookieStore.delete('connect.sid');
        redirect('/login');
      }}>
        <button type="submit" className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Logout</button>
      </form>
    </div>
  );
}
