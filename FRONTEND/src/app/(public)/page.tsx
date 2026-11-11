import { HomeContent } from './HomeContent';
import { MinimalSchoolPage } from '@/components/public/MinimalSchoolPage';
import { getHostSchoolPublic } from '@/lib/school-brand';

// The long page is written for one school. Any other school gets a short page of its own details.
export default async function HomePage() {
  const school = await getHostSchoolPublic();
  return school?.publicSite === 'full' || !school ? <HomeContent /> : <MinimalSchoolPage school={school} />;
}
