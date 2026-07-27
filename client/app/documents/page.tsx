import { redirect } from 'next/navigation';

/** Legacy list route — redirect to the new dashboard. */
export default function DocumentsIndexRedirect() {
  redirect('/dashboard');
}
