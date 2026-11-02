import { AcademicsContent } from './AcademicsContent';
import { MinimalSchoolPage } from '@/components/public/MinimalSchoolPage';
import { getHostSchoolPublic } from '@/lib/school-brand';

// The long page is written for one school. Any other school gets a short page of its own details.
export default async function AcademicsPage() {
  const school = await getHostSchoolPublic();
  return school?.publicSite === 'full' ? <AcademicsContent /> : <MinimalSchoolPage school={school} />;
}
