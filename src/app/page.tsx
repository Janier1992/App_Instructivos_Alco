import { PROCESSES } from '@/src/data/processesData';
import { ProcessList } from '@/src/components/ProcessList';

export default function HomePage() {
  return <ProcessList processes={PROCESSES} />;
}
